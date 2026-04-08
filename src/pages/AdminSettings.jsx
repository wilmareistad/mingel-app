import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import {
  listenToParticipants,
  updateTimerDuration,
  updateResultsTimerDuration,
  removeParticipant,
} from "../features/event/eventService";
import { useTheme } from "../hooks/useTheme";
import { useAdminEvent } from "../hooks/useAdminEvent";
import { useCurrentQuestion } from "../hooks/useCurrentQuestion";
import { useQuestionTimer } from "../hooks/useQuestionTimer";
import { useResultsTimer } from "../hooks/useResultsTimer";
import { useGameControls } from "../hooks/useGameControls";
import ConfirmModal from "../components/ConfirmModal";
import ParticipantsPanel from "../components/ParticipantsPanel";
import TimerControl from "../components/TimerControl";
import LobbyControls from "../components/LobbyControls";
import GameControls from "../components/GameControls";
import ResultsControls from "../components/ResultsControls";
import styles from "./AdminSettings.module.css";

export default function AdminSettings() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // ── Hooks ──────────────────────────────────────────────────────────
  const { event, loading, message, setMessage } = useAdminEvent(eventId, () =>
    navigate("/admin")
  );

  const [participants, setParticipants] = useState([]);
  const { currentQuestion, voteCount, setVoteCount } = useCurrentQuestion(event);

  const {
    handleNextQuestion,
    handleStartGame,
    handleEndGame,
    handleEndQuestion,
    handleResetGame,
    showMessage,
  } = useGameControls(eventId, participants, setMessage);

  // Define callback before using it in useResultsTimer
  const handleResultsTimerExpired = useCallback(() => {
    handleNextQuestion();
  }, [handleNextQuestion]);

  const { timeLeft: questionTimeLeft } = useQuestionTimer(event, eventId);
  const { timeLeft: resultsTimeLeft } = useResultsTimer(
    event,
    eventId,
    handleResultsTimerExpired
  );

  // Apply theme based on event
  useTheme(event?.theme);

  // ── Local State ────────────────────────────────────────────────────
  const [pendingTimerSeconds, setPendingTimerSeconds] = useState(null);
  const [pendingResultsTimerSeconds, setPendingResultsTimerSeconds] =
    useState(null);
  const [isKickMode, setIsKickMode] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [allQuestions, setAllQuestions] = useState([]);

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    confirmStyle: "default",
  });

  // ── Participants Listener ──────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;

    const unsubscribeParticipants = listenToParticipants(
      eventId,
      (updatedParticipants) => {
        setParticipants(updatedParticipants);

        // Count participants who have answered the current question
        if (event?.status === "question" && currentQuestion) {
          const answeredCount = updatedParticipants.filter(
            (p) => p.hasAnswered
          ).length;
          setVoteCount(answeredCount);
        }
      }
    );

    return () => unsubscribeParticipants();
  }, [eventId, event?.status, currentQuestion?.id, setVoteCount]);

  // ── Modal Helpers ──────────────────────────────────────────────────
  const openConfirmModal = (
    title,
    message,
    onConfirm,
    confirmText = "Confirm",
    confirmStyle = "default"
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

  // ── Event Management ───────────────────────────────────────────────
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

  const handleDeleteEvent = () => {
    openConfirmModal(
      "Delete Event",
      "Are you sure you want to permanently delete this event? This cannot be undone.",
      async () => {
        closeModal();
        try {
          const deleteSubcollection = async (path) => {
            const snap = await getDocs(collection(db, path));
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
          };

          await deleteSubcollection(`events/${eventId}/participants`);
          await deleteSubcollection(`events/${eventId}/answers`);

          await deleteDoc(doc(db, "events", eventId));
          navigate("/admin");
        } catch (e) {
          console.error(e);
          showMessage("Error deleting event.");
        }
      },
      "Delete Event",
      "danger"
    );
  };

  // ── Timer Management ───────────────────────────────────────────────
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

  // ── Helpers ────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────
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

        <button
          className={styles.viewLobbyBtn}
          onClick={() => navigate(`/admin/lobby/${eventId}`)}
        >
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
          <TimerControl
            label="Question Timer"
            currentValue={getCurrentTimerLabel()}
            options={timerOptions}
            onIncrement={handleTimerIncrement}
            onDecrement={handleTimerDecrement}
            onConfirm={handleConfirmTimer}
            formatValue={(val) => val}
            disabled={pendingTimerSeconds === null && event.status !== "lobby"}
          />

          <TimerControl
            label="Results Timer"
            currentValue={getCurrentResultsTimerLabel()}
            options={resultsTimerOptions}
            onIncrement={handleResultsTimerIncrement}
            onDecrement={handleResultsTimerDecrement}
            onConfirm={handleConfirmResultsTimer}
            formatValue={(val) => val}
            disabled={
              pendingResultsTimerSeconds === null && event.status !== "lobby"
            }
          />
        </div>

        {/* ── Lobby ── */}
        {event.status === "lobby" && (
          <LobbyControls
            event={event}
            allQuestions={allQuestions}
            onRemoveQuestion={handleRemoveQuestion}
            onStartGame={handleStartGame}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {/* ── Question phase ── */}
        {event.status === "question" && (
          <GameControls
            event={event}
            currentQuestion={currentQuestion}
            voteCount={voteCount}
            totalParticipants={participants.length}
            timeLeftDisplay={getTimeLeftDisplay()}
            onNextQuestion={handleNextQuestion}
            onEndQuestion={handleEndQuestion}
            onEndGame={() => openConfirmModal(
              "End Game",
              "Are you sure you want to end this game?",
              () => {
                closeModal();
                handleEndGame();
              },
              "End Game",
              "danger"
            )}
            onResetGame={() => openConfirmModal(
              "Reset Game",
              "Reset the game? All answers will be cleared.",
              () => {
                closeModal();
                handleResetGame();
              },
              "Reset Game",
              "danger"
            )}
          />
        )}

        {/* ── Results phase ── */}
        {event.status === "results" && (
          <ResultsControls
            event={event}
            timeLeftDisplay={getResultsTimeLeftDisplay()}
            onNextQuestion={handleNextQuestion}
            onEndGame={() => openConfirmModal(
              "End Game",
              "Are you sure you want to end this game?",
              () => {
                closeModal();
                handleEndGame();
              },
              "End Game",
              "danger"
            )}
            onResetGame={() => openConfirmModal(
              "Reset Game",
              "Reset the game? All answers will be cleared.",
              () => {
                closeModal();
                handleResetGame();
              },
              "Reset Game",
              "danger"
            )}
          />
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
