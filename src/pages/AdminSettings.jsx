import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
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
  const [timeLeft, setTimeLeft] = useState(0);
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

        if (adminId && eventData.adminId !== adminId) {
          navigate("/admin");
          return;
        }

        if (eventData.status === "question") {
          const allQuestionIds = [
            ...(eventData.questions || []),
            ...(eventData.customQuestions || []),
          ];

          const questionIndex = eventData.currentQuestionIndex || 0;
          if (questionIndex < allQuestionIds.length) {
            const questionId = allQuestionIds[questionIndex];
            let questionSnap = await getDoc(doc(db, "questions", questionId));
            if (!questionSnap.exists()) {
              questionSnap = await getDoc(
                doc(db, "customQuestions", questionId),
              );
            }
            if (questionSnap.exists()) {
              setCurrentQuestion({
                id: questionSnap.id,
                ...questionSnap.data(),
              });
            } else {
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

  // Fetch all questions for lobby display
  useEffect(() => {
    if (!event || event.status !== "lobby") return;

    async function fetchAllQuestions() {
      const publicIds = event.questions || [];
      const customIds = event.customQuestions || [];
      let result = [];

      if (publicIds.length > 0) {
        const snapshot = await getDocs(collection(db, "questions"));
        const all = snapshot.docs.map((d) => ({
          id: d.id,
          source: "public",
          ...d.data(),
        }));
        result = [...result, ...all.filter((q) => publicIds.includes(q.id))];
      }

      if (customIds.length > 0) {
        const snapshot = await getDocs(collection(db, "customQuestions"));
        const all = snapshot.docs.map((d) => ({
          id: d.id,
          source: "custom",
          ...d.data(),
        }));
        result = [...result, ...all.filter((q) => customIds.includes(q.id))];
      }

      setAllQuestions(result);
    }

    fetchAllQuestions();
  }, [event?.questions, event?.customQuestions, event?.status]);

  // Listen to participants
  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = listenToParticipants(eventId, setParticipants);
    return unsubscribe;
  }, [eventId]);

  // Poll answers for current question
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
    loadAnswers();
    const interval = setInterval(loadAnswers, 2000);
    return () => clearInterval(interval);
  }, [eventId, event?.status, currentQuestion?.id]);

  // Question timer countdown
  useEffect(() => {
    if (!event || event.status !== "question") {
      setTimeLeft(0);
      return;
    }
    const update = () => {
      const dur = event.questionTimerSeconds || 300;
      const started =
        event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;
      if (!started) {
        setTimeLeft(dur);
        return;
      }
      setTimeLeft(Math.max(0, dur - Math.floor((Date.now() - started) / 1000)));
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [event]);

  // Results timer countdown
  useEffect(() => {
    if (!event || event.status !== "results" || !event.showingResultsOnly) {
      setResultsTimeLeft(0);
      return;
    }
    const update = () => {
      const dur = event.resultsTimerSeconds || 10;
      const started =
        event.resultsPhaseStartedAt?.toMillis?.() ||
        event.resultsPhaseStartedAt;
      if (!started) {
        setResultsTimeLeft(dur);
        return;
      }
      setResultsTimeLeft(
        Math.max(0, dur - Math.floor((Date.now() - started) / 1000)),
      );
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [event]);

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
      await resetParticipantsAnswered(eventId);
      await updateCurrentQuestionIndex(eventId, 0);
      await updateEventStatus(eventId, "question");
      showMessage("Game started!");
    } catch (e) {
      showMessage("Error starting game.");
    }
  };

  const handleNextQuestion = async () => {
    try {
      if (!event) return;
      await setShowingResultsOnly(eventId, false);
      await deleteAnswersForEvent(eventId);
      await resetParticipantsAnswered(eventId);
      const total =
        (event.questions?.length || 0) + (event.customQuestions?.length || 0);
      const nextIndex = ((event.currentQuestionIndex || 0) + 1) % total;
      await updateCurrentQuestionIndex(eventId, nextIndex);
      await updateEventStatus(eventId, "question");
      showMessage(
        nextIndex === 0
          ? "Looping back to first question!"
          : "Next question displayed.",
      );
    } catch (e) {
      showMessage("Error moving to next question.");
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
          await resetParticipantsAnswered(eventId);
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

  const getCurrentTimerLabel = () =>
    formatSeconds(pendingTimerSeconds ?? event?.questionTimerSeconds ?? 300);
  const getCurrentResultsTimerLabel = () =>
    `${pendingResultsTimerSeconds ?? event?.resultsTimerSeconds ?? 10}s`;
  const getTimeLeftDisplay = () => formatSeconds(timeLeft);
  const getResultsTimeLeftDisplay = () => `${resultsTimeLeft}s`;

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
      <button className={styles.backBtn} onClick={() => navigate("/admin")}>
        ← Back
      </button>

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
