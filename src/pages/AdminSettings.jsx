import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc, collection, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import {
  listenToParticipants,
  resetParticipantsAnswered,
  setShowingResultsOnly,
  updateTimerDuration,
  updateResultsTimerDuration,
  removeParticipant,
} from "../features/event/eventService";
import {
  updateEventStatus,
  updateCurrentQuestionIndex,
  updateToQuestionPhase,
} from "../features/event/eventService";
import { deleteAnswersForEvent } from "../features/game/dataCleanup";
import { getQuestionAnswers } from "../features/game/gameService";
import ConfirmModal from "../components/ConfirmModal";
import ParticipantsPanel from "../components/ParticipantsPanel";
import ToggleButton from "../components/ToggleButton";
import QuestionDisplay from "../components/QuestionDisplay";
import AllQuestionsList from "../components/AllQuestionsList";
import styles from "./AdminSettings.module.css";

export default function AdminSettings() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [message, setMessage] = useState("");
  const [pendingTimerSeconds, setPendingTimerSeconds] = useState(null);
  const [pendingResultsTimerSeconds, setPendingResultsTimerSeconds] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [resultsTimeLeft, setResultsTimeLeft] = useState(0);
  const [isKickMode, setIsKickMode] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    confirmStyle: "default",
  });

  // Track if timer expiration callback has already fired for this phase (prevents duplicate writes)
  const questionTimerExpiredRef = useRef(false);
  const resultsTimerExpiredRef = useRef(false);
  const resultsPhaseIdRef = useRef(null); // Track which results phase we're in
  const questionPhaseIdRef = useRef(null); // Track which question phase we're in

  // Check admin authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setAdminId(user.uid);
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  // Listen to event changes (just update state, don't fetch questions)
  useEffect(() => {
    if (!eventId) return;

    const eventRef = doc(db, "events", eventId);
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        const eventData = { id: docSnap.id, ...docSnap.data() };
        setEvent(eventData);

        // Check if admin owns this event
        if (adminId && eventData.adminId !== adminId) {
          navigate("/admin");
          return;
        }
      } else {
        setMessage("Event not found");
      }
    });

    return unsubscribe;
  }, [eventId, adminId, navigate]);

  // Listen to participants in real-time (✅ efficient: tracks answered status via listener)
  useEffect(() => {
    if (!eventId) return;

    const unsubscribeParticipants = listenToParticipants(eventId, (updatedParticipants) => {
      setParticipants(updatedParticipants);
      
      // Count participants who have answered the current question
      if (event?.status === "question" && currentQuestion) {
        const answeredCount = updatedParticipants.filter(p => p.hasAnswered).length;
        setVoteCount(answeredCount);
      }
    });

    return () => unsubscribeParticipants();
  }, [eventId, event?.status, currentQuestion?.id]);

  // Fetch current question ONLY when currentQuestionIndex changes (not on every event update)
  useEffect(() => {
    if (!event || event.status !== "question") {
      setCurrentQuestion(null);
      return;
    }

    const fetchCurrentQuestion = async () => {
      const allQuestionIds = [
        ...(event.questions || []),
        ...(event.customQuestions || [])
      ];
      
      const questionIndex = event.currentQuestionIndex || 0;
      if (questionIndex < allQuestionIds.length) {
        const questionId = allQuestionIds[questionIndex];
        
        // Try to fetch from public questions first
        let questionSnap = await getDoc(doc(db, "questions", questionId));
        
        // If not found in public, try custom questions
        if (!questionSnap.exists()) {
          questionSnap = await getDoc(doc(db, "customQuestions", questionId));
        }
        
        if (questionSnap.exists()) {
          setCurrentQuestion({
            id: questionSnap.id,
            ...questionSnap.data(),
          });
        } else {
          console.error("Question not found:", questionId);
          setCurrentQuestion(null);
        }
      }
    };

    fetchCurrentQuestion();
  }, [event?.status, event?.currentQuestionIndex, event?.questions, event?.customQuestions]);

  // ✅ Question Phase Timer - Auto-transition to results when timer expires
  // Follows DEVELOPMENT_RULES: No Firestore reads inside loop, use event data from listener
  useEffect(() => {
    console.log(`⏱️ Question timer effect running: status=${event?.status}, index=${event?.currentQuestionIndex}`);
    
    if (!event || event.status !== "question") {
      console.log(`⏱️ Question timer effect exiting: status=${event?.status}`);
      setQuestionTimeLeft(0);
      questionTimerExpiredRef.current = false;
      return;
    }

    const updateQuestionTimeLeft = () => {
      const durationSeconds = event.questionTimerSeconds || 30;
      const questionPhaseStartedAt =
        event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;

      if (!questionPhaseStartedAt) {
        setQuestionTimeLeft(durationSeconds);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - questionPhaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      setQuestionTimeLeft(remaining);

      // ✅ SAFE: Auto-transition to results when question timer expires
      // Uses useRef guard to prevent duplicate fires (DEVELOPMENT_RULES: Pattern 3)
      // Uses event data from listener (no DB read)
      // Additional safety: Only transition if duration is positive (prevents immediate transition with bad config)
      if (remaining === 0 && !questionTimerExpiredRef.current && durationSeconds > 0) {
        questionTimerExpiredRef.current = true;
        console.log(`🔴 Question timer FIRED (remaining=${remaining}, duration=${durationSeconds})! Auto-advancing to results...`);
        
        // Atomic write: transition to results phase
        // ✅ Set both status AND showingResultsOnly so participants navigate to results
        const eventRef = doc(db, "events", eventId);
        updateDoc(eventRef, {
          status: "results",
          showingResultsOnly: true,
          resultsPhaseStartedAt: serverTimestamp(),
        }).catch(error => {
          console.error(`❌ Error transitioning to results:`, error);
          questionTimerExpiredRef.current = false; // Reset on error
        });
      }
    };

    // Update immediately
    updateQuestionTimeLeft();

    // Then update every 100ms for smooth display
    // ✅ SAFE: This is a local calculation loop, NOT a Firestore read loop
    const interval = setInterval(updateQuestionTimeLeft, 100);

    return () => {
      console.log(`⏱️ Question timer effect cleanup: clearing interval`);
      clearInterval(interval);
    };
  }, [event?.status, event?.phaseStartedAt, event?.questionTimerSeconds, eventId]);

  // Reset guard when entering a NEW question phase
  // CRITICAL: Only reset when we're in a new question phase, not on every timestamp update
  useEffect(() => {
    if (event?.status === "question") {
      const currentPhaseId = `question_${event?.currentQuestionIndex}`;
      if (currentPhaseId !== questionPhaseIdRef.current) {
        console.log(`🔵 Question phase ENTERED (Q${event?.currentQuestionIndex}), resetting guard from "${questionPhaseIdRef.current}" to "${currentPhaseId}"`);
        questionPhaseIdRef.current = currentPhaseId;
        questionTimerExpiredRef.current = false;
      }
    }
  }, [event?.status, event?.currentQuestionIndex]);

  // ✅ Auto-advance timer for results phase
  // Follows DEVELOPMENT_RULES: No Firestore reads inside loop, use event data from listener
  useEffect(() => {
    console.log(`⏱️ Results timer effect running: status=${event?.status}, showingResultsOnly=${event?.showingResultsOnly}`);
    
    if (!event || event.status !== "results" || !event.showingResultsOnly) {
      console.log(`⏱️ Results timer effect exiting: status=${event?.status}, showingResultsOnly=${event?.showingResultsOnly}`);
      setResultsTimeLeft(0);
      resultsTimerExpiredRef.current = false;
      return;
    }

    // Capture the phase start time and duration at the START of the effect
    // This prevents issues if event data changes during the interval
    const capturedPhaseStartedAt =
      event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;
    const capturedDurationSeconds = event.resultsTimerSeconds || 10;

    console.log(`⏱️ Results timer SETUP: phaseStartedAt=${capturedPhaseStartedAt}, duration=${capturedDurationSeconds}s`);

    if (!capturedPhaseStartedAt) {
      console.log(`⏱️ Results timer has no phaseStartedAt, showing full duration`);
      setResultsTimeLeft(capturedDurationSeconds);
      return;
    }

    const updateResultsTimeLeft = () => {
      const now = Date.now();
      const elapsedMs = now - capturedPhaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, capturedDurationSeconds - elapsedSeconds);

      setResultsTimeLeft(remaining);

      // ✅ SAFE: Auto-advance when results timer expires
      // Uses useRef guard to prevent duplicate fires (DEVELOPMENT_RULES: Pattern 3)
      // Uses event data from listener (no DB read)
      // Additional safety: Only advance if duration is positive (prevents immediate advance with bad config)
      if (remaining === 0 && !resultsTimerExpiredRef.current && capturedDurationSeconds > 0) {
        resultsTimerExpiredRef.current = true;
        console.log(`🟢 Results timer FIRED (remaining=${remaining}, duration=${capturedDurationSeconds})! Auto-advancing to next question...`);
        console.log(`🟢 Current question index before advance: ${event.currentQuestionIndex}, showingResultsOnly=${event.showingResultsOnly}`);
        
        // Auto-advance to next question
        handleNextQuestion().catch(err => {
          console.error("❌ Auto-advance failed:", err);
          resultsTimerExpiredRef.current = false; // Reset on error so we can try again
        });
      }
    };

    // Update immediately
    updateResultsTimeLeft();

    // Then update every 100ms for smooth display
    // ✅ SAFE: This is a local calculation loop, NOT a Firestore read loop
    const interval = setInterval(updateResultsTimeLeft, 100);

    return () => {
      console.log(`⏱️ Results timer effect cleanup: clearing interval`);
      clearInterval(interval);
    };
  }, [event?.status, event?.showingResultsOnly, event?.resultsPhaseStartedAt, event?.resultsTimerSeconds, eventId]);

  // Reset ref when entering a NEW results phase (question index changed)
  // CRITICAL: Only reset when we're in a new results phase, not on every timestamp update
  useEffect(() => {
    // Only reset if we're in results phase AND it's a different question
    if (event?.status === "results" && event?.showingResultsOnly) {
      const currentPhaseId = `results_${event?.currentQuestionIndex}`;
      if (currentPhaseId !== resultsPhaseIdRef.current) {
        console.log(`🔵 Results phase ENTERED (Q${event?.currentQuestionIndex}), resetting guard from "${resultsPhaseIdRef.current}" to "${currentPhaseId}"`);
        resultsPhaseIdRef.current = currentPhaseId;
        resultsTimerExpiredRef.current = false;
      }
    }
  }, [event?.status, event?.showingResultsOnly, event?.currentQuestionIndex]);

  const openConfirmModal = (
    title,
    message,
    onConfirm,
    confirmText = "Confirm",
    confirmStyle = "default",
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      confirmStyle,
    });
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false,
    });
  };

  const handleStartGame = async () => {
    try {
      // Reset all participants answered status before starting
      // ✅ Pass participants array to avoid extra getEventParticipants() read
      await resetParticipantsAnswered(eventId, participants);

      // Reset question index to start from first question
      await updateCurrentQuestionIndex(eventId, 0);

      // Then transition to question status
      await updateEventStatus(eventId, "question");
      setMessage("Game started! First question displayed.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error starting game:", error);
      setMessage("Error starting game");
    }
  };

  const handleNextQuestion = async () => {
    try {
      if (!eventId) return;

      console.log(`📋 handleNextQuestion CALLED for event: ${eventId}, timestamp=${new Date().toISOString()}`);

      // CRITICAL: Fetch fresh event data from Firestore instead of using stale state
      // This ensures we always get the correct currentQuestionIndex
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      const currentEvent = eventSnap.data();

      if (!currentEvent) {
        console.log(`📋 handleNextQuestion: Event not found!`);
        return;
      }

      console.log(`📋 handleNextQuestion: Current question index in DB: ${currentEvent.currentQuestionIndex}, Total questions: ${(currentEvent.questions?.length || 0) + (currentEvent.customQuestions?.length || 0)}`);
      console.log(`📋 handleNextQuestion: Current event state: status=${currentEvent.status}, showingResultsOnly=${currentEvent.showingResultsOnly}`);

      // Clear the "showing results only" flag
      console.log(`📋 handleNextQuestion: Calling setShowingResultsOnly(false)...`);
      await setShowingResultsOnly(eventId, false);

      // DELETE answers from previous question to prevent phantom votes
      console.log(`📋 handleNextQuestion: Deleting answers...`);
      await deleteAnswersForEvent(eventId);

      // Reset all participants answered status before showing next question
      // ✅ Pass participants array if available to avoid extra read
      console.log(`📋 handleNextQuestion: Resetting participants...`);
      await resetParticipantsAnswered(eventId, participants.length > 0 ? participants : null);
      
      // Calculate total questions (public + custom)
      const totalQuestions = (currentEvent.questions?.length || 0) + (currentEvent.customQuestions?.length || 0);
      
      // Use the FRESH currentQuestionIndex from Firestore, not stale state
      const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;
      
      console.log(`📋 handleNextQuestion: Next index will be: ${nextIndex}, Total questions: ${totalQuestions}`);
      
      // Check if we've reached the end of all questions
      if (nextIndex >= totalQuestions) {
        // All questions done - show final results
        console.log(`🏁 All questions completed! Game finished.`);
        setMessage("All questions completed! Game finished.");
      } else {
        // More questions to go - proceed to next question
        // ✅ ATOMIC WRITE: Update index AND status together to prevent race conditions
        // This ensures listener fires with both currentQuestionIndex and status="question" at the same time
        console.log(`📋 handleNextQuestion: Advancing from index ${currentEvent.currentQuestionIndex} to ${nextIndex}...`);
        console.log(`📋 handleNextQuestion: Calling updateToQuestionPhase(${eventId}, ${nextIndex})...`);
        await updateToQuestionPhase(eventId, nextIndex);
        console.log(`📋 handleNextQuestion: updateToQuestionPhase completed!`);
        
        setMessage("Next question displayed.");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("❌ Error moving to next question:", error);
      setMessage("Error moving to next question");
    }
  };

  const handleEndGame = async () => {
    openConfirmModal(
      "End Game",
      "Are you sure you want to end this game?",
      async () => {
        closeModal();
        try {
          await updateEventStatus(eventId, "results");
          setMessage("Game ended. Results displayed.");
          setTimeout(() => setMessage(""), 3000);
        } catch (error) {
          console.error("Error ending game:", error);
          setMessage("Error ending game");
        }
      },
      "End Game",
      "danger",
    );
  };

  const handleEndQuestion = async () => {
    try {
      // Show results for current question without ending the game
      await setShowingResultsOnly(eventId, true);
      await updateEventStatus(eventId, "results");
      setMessage(
        "Question ended. Results displayed. Click 'Next Question' to continue.",
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error ending question:", error);
      setMessage("Error ending question");
    }
  };

  const handleResetGame = async () => {
    openConfirmModal(
      "Reset Game",
      "Are you sure you want to reset the game? All answers will be cleared, and the game will return to the lobby.",
      async () => {
        closeModal();
        try {
          // Deactivate timers by setting showingResultsOnly to false
          await setShowingResultsOnly(eventId, false);

          // Clear all answers from previous round
          await deleteAnswersForEvent(eventId);

          // Reset to lobby state and back to first question
          await updateCurrentQuestionIndex(eventId, 0);
          // ✅ Pass participants array if available to avoid extra read
          await resetParticipantsAnswered(eventId, participants.length > 0 ? participants : null);
          await updateEventStatus(eventId, "lobby");
          setMessage("Game reset! Ready to play again.");
          setTimeout(() => setMessage(""), 3000);
        } catch (error) {
          console.error("Error resetting game:", error);
          setMessage("Error resetting game");
        }
      },
      "Reset Game",
      "danger",
    );
  };

  const handleBackToPanel = () => {
    navigate("/admin");
  };

  // Timer options in seconds (0.5 to 15 minutes with 30-second increments)
  const timerOptions = [
    5, 10, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 450, 540, 630, 720,
    810, 900,
  ];

  const handleTimerChange = async (seconds) => {
    try {
      await updateTimerDuration(eventId, seconds);
      setMessage(`Timer set to ${Math.floor(seconds / 60)} minutes`);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating timer:", error);
      setMessage("Error updating timer");
    }
  };

  const handleTimerIncrement = () => {
    const currentSeconds =
      pendingTimerSeconds !== null
        ? pendingTimerSeconds
        : event?.questionTimerSeconds || 300;
    const currentIndex = timerOptions.indexOf(currentSeconds);
    if (currentIndex < timerOptions.length - 1) {
      setPendingTimerSeconds(timerOptions[currentIndex + 1]);
    }
  };

  const handleTimerDecrement = () => {
    const currentSeconds =
      pendingTimerSeconds !== null
        ? pendingTimerSeconds
        : event?.questionTimerSeconds || 300;
    const currentIndex = timerOptions.indexOf(currentSeconds);
    if (currentIndex > 0) {
      setPendingTimerSeconds(timerOptions[currentIndex - 1]);
    }
  };

  const handleConfirmTimer = async () => {
    if (pendingTimerSeconds !== null) {
      await handleTimerChange(pendingTimerSeconds);
      setPendingTimerSeconds(null);
    }
  };

  // Results timer options in seconds (5 to 60 seconds with 5-second increments)
  const resultsTimerOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  const handleResultsTimerChange = async (seconds) => {
    try {
      await updateResultsTimerDuration(eventId, seconds);
      setMessage(`Results timer set to ${seconds} seconds`);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating results timer:", error);
      setMessage("Error updating results timer");
    }
  };

  const handleResultsTimerIncrement = () => {
    const currentSeconds =
      pendingResultsTimerSeconds !== null
        ? pendingResultsTimerSeconds
        : event?.resultsTimerSeconds || 10;
    const currentIndex = resultsTimerOptions.indexOf(currentSeconds);
    if (currentIndex < resultsTimerOptions.length - 1) {
      setPendingResultsTimerSeconds(resultsTimerOptions[currentIndex + 1]);
    }
  };

  const handleResultsTimerDecrement = () => {
    const currentSeconds =
      pendingResultsTimerSeconds !== null
        ? pendingResultsTimerSeconds
        : event?.resultsTimerSeconds || 10;
    const currentIndex = resultsTimerOptions.indexOf(currentSeconds);
    if (currentIndex > 0) {
      setPendingResultsTimerSeconds(resultsTimerOptions[currentIndex - 1]);
    }
  };

  const handleConfirmResultsTimer = async () => {
    if (pendingResultsTimerSeconds !== null) {
      await handleResultsTimerChange(pendingResultsTimerSeconds);
      setPendingResultsTimerSeconds(null);
    }
  };

  const handleKickPlayer = (participant) => {
    console.log("handleKickPlayer called with:", { eventId, participant });
    if (!eventId) {
      console.error("Event ID is not available");
      setMessage("Error: Event ID not found.");
      return;
    }

    const currentEventId = String(eventId);
    const participantId = String(participant.id);
    const participantName = participant.name;
    console.log("currentEventId set to:", currentEventId);
    setModalState({
      isOpen: true,
      title: "Kick Player",
      message: `Are you sure you want to kick ${participantName} from the game?`,
      onConfirm: async () => {
        console.log("Modal onConfirm - about to kick player:", {
          currentEventId,
          participantId,
        });
        try {
          await removeParticipant(currentEventId, participantId);
          setMessage(`${participantName} has been kicked from the game.`);
          setTimeout(() => setMessage(""), 3000);
        } catch (error) {
          console.error("Error kicking player:", error);
          setMessage("Error kicking player. Please try again.");
        }
        setModalState((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText: "Kick Player",
      confirmStyle: "danger",
    });
  };

  const getCurrentTimerLabel = () => {
    const seconds =
      pendingTimerSeconds !== null
        ? pendingTimerSeconds
        : event?.questionTimerSeconds || 300;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    } else if (remainingSeconds === 0) {
      return `${minutes}min`;
    } else {
      return `${minutes}min ${remainingSeconds}s`;
    }
  };

  const getTimeLeftDisplay = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    } else if (seconds === 0) {
      return `${minutes}min`;
    } else {
      return `${minutes}min ${seconds}s`;
    }
  };

  const getCurrentResultsTimerLabel = () => {
    const seconds =
      pendingResultsTimerSeconds !== null
        ? pendingResultsTimerSeconds
        : event?.resultsTimerSeconds || 10;
    return `${seconds}s`;
  };

  const getResultsTimeLeftDisplay = () => {
    return `${resultsTimeLeft}s`;
  };

  if (loading) return <p>Loading...</p>;

  if (!event) {
    return (
      <div className={styles.container}>
        <button className="adminButton" onClick={handleBackToPanel}>
          ← Back to Panel
        </button>
        <p className={styles.error}>{message || "Event not found"}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={`${styles.backBtn} adminButton`}
          onClick={handleBackToPanel}
        >
          ← Back to Panel
        </button>
        <h1>{event.name}</h1>
      </div>

      {message && <p className={styles.message}>{message}</p>}

      {/* Admin Controls */}
      <div className={styles.controls}>
        <div className={styles.statusSection}>
          <h2>Game Status</h2>
          <p className={styles.statusBadge}>
            <span>Status: </span>
            <strong>{event.status}</strong>
          </p>
        </div>

        <div className={styles.statusSection}>
          <h2>Question Timer</h2>
          <div className={styles.timerControl}>
            <ToggleButton
              direction="left"
              onClick={handleTimerDecrement}
              label="Decrease time"
            />
            <div className={styles.timerInputDisplay}>
              <span>{getCurrentTimerLabel()}</span>
            </div>
            <ToggleButton
              direction="right"
              onClick={handleTimerIncrement}
              label="Increase time"
            />
            <button
              className={styles.setTimerBtn}
              onClick={handleConfirmTimer}
              disabled={pendingTimerSeconds === null}
            >
              Set Time
            </button>
          </div>
        </div>

        <div className={styles.statusSection}>
          <h2>Results Timer</h2>
          <div className={styles.timerControl}>
            <ToggleButton
              direction="left"
              onClick={handleResultsTimerDecrement}
              label="Decrease time"
            />
            <div className={styles.timerInputDisplay}>
              <span>{getCurrentResultsTimerLabel()}</span>
            </div>
            <ToggleButton
              direction="right"
              onClick={handleResultsTimerIncrement}
              label="Increase time"
            />
            <button
              className={styles.setTimerBtn}
              onClick={handleConfirmResultsTimer}
              disabled={pendingResultsTimerSeconds === null}
            >
              Set Time
            </button>
          </div>
        </div>

        <div className={styles.actionSection}>
          {event.status === "lobby" && (
            <>
              <AllQuestionsList 
                publicQuestionIds={event.questions} 
                customQuestionIds={event.customQuestions}
              />
              <button
                className={`${styles.startBtn} adminButton`}
                onClick={handleStartGame}
              >
                Start Game
              </button>
            </>
          )}

          {event.status === "question" && (
            <>
              <div className={styles.questionSection}>
                <QuestionDisplay
                  question={currentQuestion}
                  currentIndex={event?.currentQuestionIndex || 0}
                  totalQuestions={(event?.questions?.length || 0) + (event?.customQuestions?.length || 0)}
                  votes={voteCount}
                  totalParticipants={participants.length}
                  timeLeft={getTimeLeftDisplay()}
                />
              </div>
              <div className={styles.buttonGroup}>
                <button
                  className={`${styles.nextBtn} adminButton`}
                  onClick={handleNextQuestion}
                >
                  Next Question
                </button>
                <button
                  className={`${styles.endQuestionBtn} adminButton`}
                  onClick={handleEndQuestion}
                >
                  End Question & Show Results
                </button>
                <button
                  className={`${styles.endBtn} adminButton`}
                  onClick={handleEndGame}
                >
                  End Game & Show Results
                </button>
                <button
                  className={`${styles.resetBtn} adminButton`}
                  onClick={handleResetGame}
                >
                  Reset Game
                </button>
              </div>
            </>
          )}

          {event.status === "results" && (
            <div className={styles.resultsSection}>
              {event.showingResultsOnly ? (
                <>
                  <p className={styles.resultsText}>
                    Showing results for current question.
                    {resultsTimeLeft > 0 && (
                      <span> Auto-advancing in {getResultsTimeLeftDisplay()}</span>
                    )}
                  </p>
                  <div className={styles.resultActions}>
                    <button
                      className={`${styles.nextBtn} adminButton`}
                      onClick={handleNextQuestion}
                    >
                      Next Question
                    </button>
                    <button
                      className={`${styles.endBtn} adminButton`}
                      onClick={handleEndGame}
                    >
                      End Game & Show Results
                    </button>
                    <button
                      className={`${styles.resetBtn} adminButton`}
                      onClick={handleResetGame}
                    >
                      Reset Game
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.resultsText}>
                    Game has finished. Results are being displayed.
                  </p>
                  <div className={styles.resultActions}>
                    <button
                      className={`${styles.resetBtn} adminButton`}
                      onClick={handleResetGame}
                    >
                      Reset Game
                    </button>
                    <button
                      className={`${styles.backBtn} adminButton`}
                      onClick={() => handleBackToPanel()}
                    >
                      Back to Panel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ParticipantsPanel
        participants={participants}
        isKickMode={isKickMode}
        onToggleKickMode={() => setIsKickMode(!isKickMode)}
        onKickClick={handleKickPlayer}
      />

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={closeModal}
        confirmText={modalState.confirmText}
        confirmStyle={modalState.confirmStyle}
      />
    </div>
  );
}
