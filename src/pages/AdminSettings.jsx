import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
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

  // Listen to event changes
  useEffect(() => {
    if (!eventId) return;

    const eventRef = doc(db, "events", eventId);
    const unsubscribe = onSnapshot(eventRef, async (docSnap) => {
      if (docSnap.exists()) {
        const eventData = { id: docSnap.id, ...docSnap.data() };
        setEvent(eventData);

        // Check if admin owns this event
        if (adminId && eventData.adminId !== adminId) {
          navigate("/admin");
          return;
        }

        // Get current question if event is showing a question
        if (eventData.status === "question") {
          const allQuestionIds = [
            ...(eventData.questions || []),
            ...(eventData.customQuestions || [])
          ];
          
          const questionIndex = eventData.currentQuestionIndex || 0;
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
        }
      } else {
        setMessage("Event not found");
      }
    });

    return unsubscribe;
  }, [eventId, adminId, navigate]);

  // Listen to participants
  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = listenToParticipants(eventId, (participantsList) => {
      setParticipants(participantsList);
    });

    return unsubscribe;
  }, [eventId]);

  // Listen to answers for current question
  useEffect(() => {
    if (!eventId || event?.status !== "question" || !currentQuestion?.id) {
      setVoteCount(0);
      return;
    }

    const loadAnswers = async () => {
      try {
        const allAnswers = await getQuestionAnswers(
          eventId,
          currentQuestion.id,
        );
        setVoteCount(allAnswers.length);
      } catch (error) {
        console.error("Error loading answers:", error);
      }
    };

    // Load initial answers
    loadAnswers();

    // Set up polling to check for new answers every 2 seconds
    const interval = setInterval(loadAnswers, 2000);

    return () => clearInterval(interval);
  }, [eventId, event?.status, currentQuestion?.id]);

  // Calculate time remaining for the current question
  useEffect(() => {
    if (!event || event.status !== "question") {
      setTimeLeft(0);
      return;
    }

    const updateTimeLeft = () => {
      const durationSeconds = event.questionTimerSeconds || 300;
      const phaseStartedAt =
        event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;

      if (!phaseStartedAt) {
        setTimeLeft(durationSeconds);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - phaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      setTimeLeft(remaining);

      // When question timer expires, transition to results (only fire once)
      if (remaining === 0 && event.status === "question" && !questionTimerExpiredRef.current) {
        questionTimerExpiredRef.current = true;
        handleTimerExpired();
      }
    };

    // Reset the callback flag when a new question phase starts
    questionTimerExpiredRef.current = false;

    // Update immediately
    updateTimeLeft();

    // Then update every 100ms for smooth display
    const interval = setInterval(updateTimeLeft, 100);

    return () => clearInterval(interval);
  }, [event]);

  // Calculate time remaining for the results phase
  useEffect(() => {
    if (!event || event.status !== "results" || !event.showingResultsOnly) {
      setResultsTimeLeft(0);
      return;
    }

    const updateResultsTimeLeft = () => {
      const durationSeconds = event.resultsTimerSeconds || 10;
      const phaseStartedAt =
        event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;

      if (!phaseStartedAt) {
        setResultsTimeLeft(durationSeconds);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - phaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      setResultsTimeLeft(remaining);
    };

    // Update immediately
    updateResultsTimeLeft();

    // Then update every 100ms for smooth display
    const interval = setInterval(updateResultsTimeLeft, 100);

    return () => clearInterval(interval);
  }, [event]);

  // Auto-advance after results timer expires (AdminSettings is the source of truth for game loop timing)
  useEffect(() => {
    if (!event || !eventId || event.status !== "results" || !event.showingResultsOnly) {
      // Reset the flag when we're not in results phase
      resultsTimerExpiredRef.current = false;
      return;
    }

    const durationSeconds = event.resultsTimerSeconds || 10;
    const phaseStartedAt =
      event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;

    if (!phaseStartedAt) {
      return;
    }

    // IMPORTANT: Reset the flag when we enter a new results phase
    // This ensures we can advance multiple times through the game
    resultsTimerExpiredRef.current = false;

    // Check if timer has expired and auto-advance
    const checkAndAdvance = async () => {
      const now = Date.now();
      const elapsedMs = now - phaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      // If time has expired, auto-advance (only once per phase)
      if (remaining <= 0 && !resultsTimerExpiredRef.current) {
        resultsTimerExpiredRef.current = true;
        
        try {
          // Fetch the current event to get fresh data
          const eventRef = doc(db, "events", eventId);
          const eventSnap = await getDoc(eventRef);
          const currentEvent = eventSnap.data();

          if (currentEvent) {
            // Combine public and custom questions
            const allQuestionIds = [
              ...(currentEvent.questions || []),
              ...(currentEvent.customQuestions || [])
            ];

            if (allQuestionIds.length > 0) {
              // Move to next question
              const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;
              
              // Check if we've reached the end of all questions
              if (nextIndex >= allQuestionIds.length) {
                // All questions done - show final results
                // Clear results display to show final results screen
                await setShowingResultsOnly(eventId, false);
                // Keep status as "results"
                // This triggers the "Game has finished" UI
                // Admin can now reset to play again
              } else {
                // More questions to go - auto-advance to next question
                // Clear old answers and reset participants
                await deleteAnswersForEvent(eventId);
                await resetParticipantsAnswered(eventId);
                
                // Update to next question
                await updateCurrentQuestionIndex(eventId, nextIndex);
                // This sets phaseStartedAt to now
                await updateEventStatus(eventId, "question");
                
                // IMPORTANT: Only clear showingResultsOnly after status changes to "question"
                // This prevents the effect from exiting prematurely
                await setShowingResultsOnly(eventId, false);
              }
            } else {
              // No questions - go back to lobby
              await updateEventStatus(eventId, "lobby");
            }
          }
        } catch (error) {
          console.error("Error auto-advancing after results:", error);
        }
      }
    };

    // Check immediately
    checkAndAdvance();

    // Then check every 100ms to catch the moment timer expires
    const interval = setInterval(checkAndAdvance, 100);

    return () => clearInterval(interval);
  }, [event?.resultsPhaseStartedAt, event?.status, event?.showingResultsOnly, event?.resultsTimerSeconds, eventId]);

  // Handle question timer expiration - transition to results
  const handleTimerExpired = async () => {
    if (!event || event.status !== "question") return;
    
    try {
      // Signal results phase start (sets resultsPhaseStartedAt)
      await setShowingResultsOnly(eventId, true);
      // Update status to results (triggers Lobby to navigate players)
      await updateEventStatus(eventId, "results");
    } catch (error) {
      console.error("Error handling timer expiration:", error);
    }
  };

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
      await resetParticipantsAnswered(eventId);

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
      if (!event) return;

      // Clear the "showing results only" flag
      await setShowingResultsOnly(eventId, false);

      // DELETE answers from previous question to prevent phantom votes
      await deleteAnswersForEvent(eventId);

      // Reset all participants answered status before showing next question
      await resetParticipantsAnswered(eventId);
      
      // Calculate total questions (public + custom)
      const totalQuestions = (event.questions?.length || 0) + (event.customQuestions?.length || 0);
      
      const nextIndex = (event.currentQuestionIndex || 0) + 1;
      
      // Check if we've reached the end of all questions
      if (nextIndex >= totalQuestions) {
        // All questions done - show final results
        setMessage("All questions completed! Game finished.");
      } else {
        // More questions to go - proceed to next question
        // Update question index FIRST before changing status
        await updateCurrentQuestionIndex(eventId, nextIndex);

        // Then transition to question status (this also sets phaseStartedAt)
        await updateEventStatus(eventId, "question");
        
        setMessage("Next question displayed.");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error moving to next question:", error);
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
          await resetParticipantsAnswered(eventId);
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
