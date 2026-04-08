import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc, collection, query, where, updateDoc, serverTimestamp, deleteDoc, getDocs } from "firebase/firestore";
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
import { useTheme } from "../hooks/useTheme";
import ConfirmModal from "../components/ConfirmModal";
import ParticipantsPanel from "../components/ParticipantsPanel";
import ToggleButton from "../components/ToggleButton";
import QuestionDisplay from "../components/QuestionDisplay";
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
  const [pendingResultsTimerSeconds, setPendingResultsTimerSeconds] =
    useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [resultsTimeLeft, setResultsTimeLeft] = useState(0);
  const [isKickMode, setIsKickMode] = useState(false);

  // Rename event state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Questions list state (for lobby view with remove functionality)
  const [allQuestions, setAllQuestions] = useState([]);

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    confirmStyle: "default",
  });

  // Apply theme based on event
  useTheme(event?.theme);

  // Track if timer expiration callback has already fired for this phase (prevents duplicate writes)
  const questionTimerExpiredRef = useRef(false);
  const resultsTimerExpiredRef = useRef(false);
  const resultsPhaseIdRef = useRef(null); // Track which results phase we're in
  const questionPhaseIdRef = useRef(null); // Track which question phase we're in

  // ✅ CRITICAL: Define handleNextQuestion BEFORE effects that use it (to avoid ReferenceError)
  const handleNextQuestion = useCallback(async () => {
    try {
      if (!eventId) return;

      // CRITICAL: Fetch fresh event data from Firestore instead of using stale state
      // This ensures we always get the correct currentQuestionIndex
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      const currentEvent = eventSnap.data();

      if (!currentEvent) {
        return;
      }

      // Clear the "showing results only" flag
      await setShowingResultsOnly(eventId, false);

      // DELETE answers from previous question to prevent phantom votes
      await deleteAnswersForEvent(eventId);

      // Reset all participants answered status before showing next question
      // ✅ Pass participants array if available to avoid extra read
      await resetParticipantsAnswered(eventId, participants.length > 0 ? participants : null);
      
      // Calculate total questions (public + custom)
      const totalQuestions = (currentEvent.questions?.length || 0) + (currentEvent.customQuestions?.length || 0);
      
      // Use the FRESH currentQuestionIndex from Firestore, not stale state
      const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;
      
      // Check if we've reached the end of all questions
      if (nextIndex >= totalQuestions) {
        // All questions done - show final results
        setMessage("All questions completed! Game finished.");
      } else {
        // More questions to go - proceed to next question
        // ✅ ATOMIC WRITE: Update index AND status together to prevent race conditions
        // This ensures listener fires with both currentQuestionIndex and status="question" at the same time
        await updateToQuestionPhase(eventId, nextIndex);
        
        setMessage("Next question displayed.");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("❌ Error moving to next question:", error);
      setMessage("Error moving to next question");
    }
  }, [eventId, participants]);

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
    if (!event || event.status !== "question") {
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
        
        // Atomic write: transition to results phase
        // ✅ Set status and resultsPhaseStartedAt - DON'T set showingResultsOnly yet
        // showingResultsOnly will be set by a separate effect once phaseStartedAt is available
        const eventRef = doc(db, "events", eventId);
        updateDoc(eventRef, {
          status: "results",
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
      clearInterval(interval);
    };
  }, [event?.status, event?.phaseStartedAt, event?.questionTimerSeconds, eventId]);

  // Reset guard when entering a NEW question phase
  // CRITICAL: Only reset when we're in a new question phase, not on every timestamp update
  useEffect(() => {
    if (event?.status === "question") {
      const currentPhaseId = `question_${event?.currentQuestionIndex}`;
      if (currentPhaseId !== questionPhaseIdRef.current) {
        questionPhaseIdRef.current = currentPhaseId;
        questionTimerExpiredRef.current = false;
      }
    }
  }, [event?.status, event?.currentQuestionIndex]);

  // ✅ Auto-advance timer for results phase
  // Follows DEVELOPMENT_RULES: No Firestore reads inside loop, use event data from listener
  useEffect(() => {
    if (!event || event.status !== "results" || !event.showingResultsOnly) {
      setResultsTimeLeft(0);
      resultsTimerExpiredRef.current = false;
      return;
    }

    // Capture the phase start time and duration at the START of the effect
    // This prevents issues if event data changes during the interval
    const capturedPhaseStartedAt =
      event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;
    const capturedDurationSeconds = event.resultsTimerSeconds || 10;

    if (!capturedPhaseStartedAt) {
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
      clearInterval(interval);
    };
  }, [event?.status, event?.showingResultsOnly, event?.resultsPhaseStartedAt, event?.resultsTimerSeconds, eventId, handleNextQuestion]);

  // Reset ref when entering a NEW results phase (question index changed)
  // CRITICAL: Only reset when we're in a new results phase, not on every timestamp update
  useEffect(() => {
    // Only reset if we're in results phase AND it's a different question
    if (event?.status === "results" && event?.showingResultsOnly) {
      const currentPhaseId = `results_${event?.currentQuestionIndex}`;
      if (currentPhaseId !== resultsPhaseIdRef.current) {
        resultsPhaseIdRef.current = currentPhaseId;
        resultsTimerExpiredRef.current = false;
      }
    }
  }, [event?.status, event?.showingResultsOnly, event?.currentQuestionIndex]);

  // ✅ Set showingResultsOnly when we enter results phase with valid timestamp
  // This ensures resultsPhaseStartedAt is available before results timer effect uses it
  useEffect(() => {
    if (event?.status === "results" && !event?.showingResultsOnly && event?.resultsPhaseStartedAt) {
      setShowingResultsOnly(eventId, true);
    }
  }, [event?.status, event?.currentQuestionIndex, event?.resultsPhaseStartedAt, eventId]);

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

  const closeModal = () =>
    setModalState((prev) => ({ ...prev, isOpen: false }));

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  // ── Rename event ──────────────────────────────────────────────
  const handleStartEditName = () => {
    setEditedName(event.name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed) return;
    try {
      await updateDoc(doc(db, "events", eventId), { name: trimmed });
      setIsEditingName(false);
      showMessage("Event name updated.");
    } catch (e) {
      console.error(e);
      showMessage("Error updating name.");
    }
  };

  const handleCancelEditName = () => setIsEditingName(false);

  // ── Remove a question from the event ─────────────────────────
  const handleRemoveQuestion = async (questionId, source) => {
    try {
      const field = source === "custom" ? "customQuestions" : "questions";
      const currentIds = event[field] || [];
      const updated = currentIds.filter((id) => id !== questionId);
      await updateDoc(doc(db, "events", eventId), { [field]: updated });
      showMessage("Question removed.");
    } catch (e) {
      console.error(e);
      showMessage("Error removing question.");
    }
  };

  // ── Delete entire event ───────────────────────────────────────
  const handleDeleteEvent = () => {
    openConfirmModal(
      "Delete Event",
      "Are you sure you want to permanently delete this event? This cannot be undone.",
      async () => {
        closeModal();
        try {
          // Delete subcollections: participants & answers
          const deleteSubcollection = async (path) => {
            const snap = await getDocs(collection(db, path));
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
          };

          await deleteSubcollection(`events/${eventId}/participants`);
          await deleteSubcollection(`events/${eventId}/answers`);

          // Delete the event doc itself
          await deleteDoc(doc(db, "events", eventId));
          navigate("/admin");
        } catch (e) {
          console.error(e);
          showMessage("Error deleting event.");
        }
      },
      "Delete Event",
      "danger",
    );
  };

  // ── Game controls ─────────────────────────────────────────────
  const handleStartGame = async () => {
    try {
      // Reset all participants answered status before starting
      // ✅ Pass participants array to avoid extra getEventParticipants() read
      await resetParticipantsAnswered(eventId, participants);

      // Reset question index to start from first question
      await updateCurrentQuestionIndex(eventId, 0);
      await updateEventStatus(eventId, "question");
      showMessage("Game started!");
    } catch (e) {
      showMessage("Error starting game.");
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
          showMessage("Game ended. Results displayed.");
        } catch (e) {
          showMessage("Error ending game.");
        }
      },
      "End Game",
      "danger",
    );
  };

  const handleEndQuestion = async () => {
    try {
      await setShowingResultsOnly(eventId, true);
      await updateEventStatus(eventId, "results");
      showMessage("Question ended. Results displayed.");
    } catch (e) {
      showMessage("Error ending question.");
    }
  };

  const handleResetGame = async () => {
    openConfirmModal(
      "Reset Game",
      "Reset the game? All answers will be cleared.",
      async () => {
        closeModal();
        try {
          await setShowingResultsOnly(eventId, false);
          await deleteAnswersForEvent(eventId);
          await updateCurrentQuestionIndex(eventId, 0);
          // ✅ Pass participants array if available to avoid extra read
          await resetParticipantsAnswered(eventId, participants.length > 0 ? participants : null);
          await updateEventStatus(eventId, "lobby");
          showMessage("Game reset!");
        } catch (e) {
          showMessage("Error resetting game.");
        }
      },
      "Reset Game",
      "danger",
    );
  };

  // ── Timer controls ────────────────────────────────────────────
  const timerOptions = [
    5, 10, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 450, 540,
    630, 720, 810, 900,
  ];
  const resultsTimerOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  const handleTimerIncrement = () => {
    const cur = pendingTimerSeconds ?? event?.questionTimerSeconds ?? 300;
    const idx = timerOptions.indexOf(cur);
    if (idx < timerOptions.length - 1)
      setPendingTimerSeconds(timerOptions[idx + 1]);
  };
  const handleTimerDecrement = () => {
    const cur = pendingTimerSeconds ?? event?.questionTimerSeconds ?? 300;
    const idx = timerOptions.indexOf(cur);
    if (idx > 0) setPendingTimerSeconds(timerOptions[idx - 1]);
  };
  const handleConfirmTimer = async () => {
    if (pendingTimerSeconds !== null) {
      await updateTimerDuration(eventId, pendingTimerSeconds);
      showMessage(`Timer set to ${formatSeconds(pendingTimerSeconds)}`);
      setPendingTimerSeconds(null);
    }
  };

  const handleResultsTimerIncrement = () => {
    const cur = pendingResultsTimerSeconds ?? event?.resultsTimerSeconds ?? 10;
    const idx = resultsTimerOptions.indexOf(cur);
    if (idx < resultsTimerOptions.length - 1)
      setPendingResultsTimerSeconds(resultsTimerOptions[idx + 1]);
  };
  const handleResultsTimerDecrement = () => {
    const cur = pendingResultsTimerSeconds ?? event?.resultsTimerSeconds ?? 10;
    const idx = resultsTimerOptions.indexOf(cur);
    if (idx > 0) setPendingResultsTimerSeconds(resultsTimerOptions[idx - 1]);
  };
  const handleConfirmResultsTimer = async () => {
    if (pendingResultsTimerSeconds !== null) {
      await updateResultsTimerDuration(eventId, pendingResultsTimerSeconds);
      showMessage(`Results timer set to ${pendingResultsTimerSeconds}s`);
      setPendingResultsTimerSeconds(null);
    }
  };

  const handleKickPlayer = (participant) => {
    setModalState({
      isOpen: true,
      title: "Kick Player",
      message: `Are you sure you want to kick ${participant.name} from the game?`,
      onConfirm: async () => {
        try {
          await removeParticipant(String(eventId), String(participant.id));
          showMessage(`${participant.name} has been kicked.`);
        } catch (e) {
          showMessage("Error kicking player.");
        }
        setModalState((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText: "Kick Player",
      confirmStyle: "danger",
    });
  };

  // ── Helpers ───────────────────────────────────────────────────
  const formatSeconds = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return `${s}s`;
    if (r === 0) return `${m}min`;
    return `${m}min ${r}s`;
  };

  const getTimeLeftDisplay = () => {
    const minutes = Math.floor(questionTimeLeft / 60);
    const seconds = questionTimeLeft % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    } else if (seconds === 0) {
      return `${minutes}min`;
    } else {
      return `${minutes}min ${seconds}s`;
    }
  };

  const getResultsTimeLeftDisplay = () => {
    return `${resultsTimeLeft}s`;
  };

  const getCurrentTimerLabel = () => {
    const seconds =
      pendingTimerSeconds !== null
        ? pendingTimerSeconds
        : event?.questionTimerSeconds || 300;
    return formatSeconds(seconds);
  };

  const getCurrentResultsTimerLabel = () => {
    const seconds =
      pendingResultsTimerSeconds !== null
        ? pendingResultsTimerSeconds
        : event?.resultsTimerSeconds || 10;
    return `${seconds}s`;
  };

  if (loading) return <p className={styles.loading}>Loading...</p>;

  if (!event) {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate("/admin")}>
          ← Back
        </button>
        <p className={styles.error}>{message || "Event not found"}</p>
      </div>
    );
  }

  const roomCode = event.code || event.roomCode || event.joinCode || eventId;
  const totalQuestions =
    (event.questions?.length || 0) + (event.customQuestions?.length || 0);

  return (
    <div className={styles.page}>
      <div className={styles.navButtonsRow}>
        <button className={styles.backBtn} onClick={() => navigate("/admin")}>
          ← Back
        </button>
        
        <button className={styles.viewLobbyBtn} onClick={() => navigate(`/admin/lobby/${eventId}`)}>
          View Lobby
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      {/* ── Main card ── */}
      <div className={styles.card}>
        {/* Event name row */}
        <div className={styles.nameRow}>
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Event Name</p>
            {isEditingName ? (
              <div className={styles.nameEditInline}>
                <input
                  className={styles.nameInputInline}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEditName();
                  }}
                  autoFocus
                />
                <button
                  className={styles.saveNameBtnInline}
                  onClick={handleSaveName}
                >
                  Save
                </button>
                <button
                  className={styles.cancelNameBtnInline}
                  onClick={handleCancelEditName}
                >
                  ✕
                </button>
              </div>
            ) : (
              <p
                className={styles.eventNameText}
                onClick={handleStartEditName}
                title="Click to rename"
              >
                {event.name}
              </p>
            )}
          </div>

          {/* Room code */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Room Code</p>
            <div className={styles.roomCodeBadge}>
              <span className={styles.roomCode}>{roomCode}</span>
            </div>
          </div>
        </div>

        {/* Timers row */}
        <div className={styles.timersRow}>
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Question Timer</p>
            <div className={styles.timerControl}>
              <ToggleButton
                direction="left"
                onClick={handleTimerDecrement}
                label="Decrease time"
              />
              <div className={styles.timerDisplay}>
                {getCurrentTimerLabel()}
              </div>
              <ToggleButton
                direction="right"
                onClick={handleTimerIncrement}
                label="Increase time"
              />
              <button
                className={styles.setBtn}
                onClick={handleConfirmTimer}
                disabled={pendingTimerSeconds === null}
              >
                Set
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Results Timer</p>
            <div className={styles.timerControl}>
              <ToggleButton
                direction="left"
                onClick={handleResultsTimerDecrement}
                label="Decrease time"
              />
              <div className={styles.timerDisplay}>
                {getCurrentResultsTimerLabel()}
              </div>
              <ToggleButton
                direction="right"
                onClick={handleResultsTimerIncrement}
                label="Increase time"
              />
              <button
                className={styles.setBtn}
                onClick={handleConfirmResultsTimer}
                disabled={pendingResultsTimerSeconds === null}
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* ── Lobby ── */}
        {event.status === "lobby" && (
          <div className={styles.section}>
            <div className={styles.questionsHeader}>
              <p className={styles.sectionLabel}>
                Questions ({totalQuestions})
              </p>
            </div>

            {allQuestions.length === 0 ? (
              <p className={styles.empty}>No questions selected.</p>
            ) : (
              <ol className={styles.questionsList}>
                {allQuestions.map((q) => (
                  <li key={q.id} className={styles.questionItem}>
                    <span className={styles.questionText}>
                      {q.text || q.id}
                    </span>
                    <button
                      className={styles.removeQuestionBtn}
                      onClick={() => handleRemoveQuestion(q.id, q.source)}
                      title="Remove question"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}

            <div className={styles.finishRow}>
              <button className={styles.primaryBtn} onClick={handleStartGame}>
                Start Game
              </button>
              <button className={styles.deleteEventBtn} onClick={handleDeleteEvent}>
                🗑 Delete Event
              </button>
            </div>
          </div>
        )}

        {/* ── Question phase ── */}
        {event.status === "question" && (
          <div className={styles.section}>
            <QuestionDisplay
              question={currentQuestion}
              currentIndex={event?.currentQuestionIndex || 0}
              totalQuestions={totalQuestions}
              votes={voteCount}
              totalParticipants={participants.length}
              timeLeft={getTimeLeftDisplay()}
            />
            <div className={styles.btnGroup}>
              <button
                className={styles.primaryBtn}
                onClick={handleNextQuestion}
              >
                Next Question
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={handleEndQuestion}
              >
                End Question & Show Results
              </button>
              <button className={styles.dangerBtn} onClick={handleEndGame}>
                End Game
              </button>
              <button className={styles.ghostBtn} onClick={handleResetGame}>
                Reset Game
              </button>
            </div>
          </div>
        )}

        {/* ── Results phase ── */}
        {event.status === "results" && (
          <div className={styles.section}>
            {event.showingResultsOnly ? (
              <>
                <p className={styles.resultsText}>
                  Showing results for current question.
                  {resultsTimeLeft > 0 && (
                    <span>
                      {" "}
                      Auto-advancing in {getResultsTimeLeftDisplay()}
                    </span>
                  )}
                </p>
                <div className={styles.btnGroup}>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleNextQuestion}
                  >
                    Next Question
                  </button>
                  <button className={styles.dangerBtn} onClick={handleEndGame}>
                    End Game
                  </button>
                  <button className={styles.ghostBtn} onClick={handleResetGame}>
                    Reset Game
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.resultsText}>
                  Game finished. Results are displayed.
                </p>
                <div className={styles.btnGroup}>
                  <button className={styles.ghostBtn} onClick={handleResetGame}>
                    Reset Game
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Participants ── */}
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
