import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { listenToParticipants, resetParticipantsAnswered, setShowingResultsOnly } from "../features/event/eventService";
import { updateEventStatus, updateCurrentQuestionIndex } from "../features/event/eventService";
import { deleteAnswersForEvent } from "../features/game/dataCleanup";
import { getQuestionAnswers } from "../features/game/gameService";
import ConfirmModal from "./ConfirmModal";
import styles from "./AdminSettings.module.css";

export default function AdminSettings() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [message, setMessage] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
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

        // Check if admin owns this event
        if (adminId && eventData.adminId !== adminId) {
          navigate("/admin");
          return;
        }

        // Get current question if event is showing a question
        if (eventData.status === "question" && eventData.questions && eventData.questions.length > 0) {
          const questionIndex = eventData.currentQuestionIndex || 0;
          if (questionIndex < eventData.questions.length) {
            const questionId = eventData.questions[questionIndex];
            const questionRef = doc(db, "questions", questionId);
            const questionSnap = await getDoc(questionRef);
            if (questionSnap.exists()) {
              setCurrentQuestion({
                id: questionSnap.id,
                ...questionSnap.data()
              });
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
        const allAnswers = await getQuestionAnswers(eventId, currentQuestion.id);
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

  const openConfirmModal = (title, message, onConfirm, confirmText = "Confirm", confirmStyle = "default") => {
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
      
      // Reset all participants answered status before showing next question
      await resetParticipantsAnswered(eventId);
      
      const nextIndex = (event.currentQuestionIndex || 0) + 1;
      // Loop back to first question if we've reached the end
      const loopedIndex = nextIndex % event.questions.length;
      
      await updateCurrentQuestionIndex(eventId, loopedIndex);
      
      // Transition back to question status
      await updateEventStatus(eventId, "question");
      
      if (loopedIndex === 0 && nextIndex > 0) {
        // We've looped back to the start
        setMessage("Looping back to first question...");
      } else {
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
      "danger"
    );
  };

  const handleEndQuestion = async () => {
    try {
      // Show results for current question without ending the game
      await setShowingResultsOnly(eventId, true);
      await updateEventStatus(eventId, "results");
      setMessage("Question ended. Results displayed. Click 'Next Question' to continue.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error ending question:", error);
      setMessage("Error ending question");
    }
  };

  const handleResetGame = async () => {
    openConfirmModal(
      "Reset Game",
      "Are you sure you want to reset the game? All answers will be cleared.",
      async () => {
        closeModal();
        try {
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
      "Reset",
      "danger"
    );
  };

  const handleBackToPanel = () => {
    navigate("/admin");
  };

  if (loading) return <p>Loading...</p>;

  if (!event) {
    return (
      <div className={styles.container}>
        <button onClick={handleBackToPanel}>← Back to Panel</button>
        <p className={styles.error}>{message || "Event not found"}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBackToPanel}>
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

        <div className={styles.actionSection}>
          {event.status === "lobby" && (
            <button className={styles.startBtn} onClick={handleStartGame}>
              Start Game
            </button>
          )}

          {event.status === "question" && (
            <>
              <div className={styles.questionSection}>
                {currentQuestion && (
                  <div className={styles.currentQuestion}>
                    <h3>Current Question ({(event.currentQuestionIndex || 0) + 1}/{event.questions.length})</h3>
                    <p>{currentQuestion.text}</p>
                    <p className={styles.voteCount}>
                      Votes: {voteCount} / {participants.length}
                    </p>
                  </div>
                )}
              </div>
              <div className={styles.buttonGroup}>
                <button className={styles.nextBtn} onClick={handleNextQuestion}>
                  Next Question
                </button>
                <button className={styles.endQuestionBtn} onClick={handleEndQuestion}>
                  End Question & Show Results
                </button>
                <button className={styles.endBtn} onClick={handleEndGame}>
                  End Game & Show Results
                </button>
              </div>
            </>
          )}

          {event.status === "results" && (
            <div className={styles.resultsSection}>
              {event.showingResultsOnly ? (
                <>
                  <p className={styles.resultsText}>Showing results for current question.</p>
                  <div className={styles.resultActions}>
                    <button className={styles.nextBtn} onClick={handleNextQuestion}>
                      Next Question
                    </button>
                    <button className={styles.endBtn} onClick={handleEndGame}>
                      End Game & Show Results
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.resultsText}>Game has finished. Results are being displayed.</p>
                  <div className={styles.resultActions}>
                    <button className={styles.resetBtn} onClick={handleResetGame}>
                      Reset Game
                    </button>
                    <button className={styles.backBtn} onClick={() => handleBackToPanel()}>
                      Back to Panel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Participants Section */}
      <div className={styles.participantsSection}>
        <h2>Participants ({participants.length})</h2>
        <div className={styles.participantsList}>
          {participants.length === 0 ? (
            <p className={styles.noParticipants}>No participants yet. Waiting for players to join...</p>
          ) : (
            participants.map((participant) => (
              <div key={participant.userId} className={styles.participantCard}>
                <span className={styles.name}>{participant.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

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
