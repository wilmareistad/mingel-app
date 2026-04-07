import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { hasUserAnswered } from "../features/game/gameService";
import { deleteAnswersForEvent } from "../features/game/dataCleanup";
import { listenToParticipants, setShowingResultsOnly } from "../features/event/eventService";
import { getCurrentEventQuestion } from "../features/question/questionService";
import UsersLobby from "./UsersLobby";
import EventQRCodeDisplay from "../components/QRCodeDisplay";
import KickedModal from "../components/KickedModal";
import styles from "./Lobby.module.css";

export default function Lobby() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const [lastQuestionIndex, setLastQuestionIndex] = useState(null);
  const [isKicked, setIsKicked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const handleLeave = async () => {
    const userDocId = localStorage.getItem("userDocId");
    const userId = localStorage.getItem("userId");
    if (userDocId) {
      // Delete from legacy users collection
      await deleteDoc(doc(db, "users", userDocId));
      
      // Also delete from participants sub-collection if available
      if (eventId && userId) {
        try {
          await deleteDoc(doc(db, "events", eventId, "participants", userId));
        } catch (error) {
          console.warn("Could not delete participant:", error);
        }
      }
      
      localStorage.removeItem("userId");
      localStorage.removeItem("eventId");
      localStorage.removeItem("userDocId");
    }
    navigate("/");
  };

  const handleKickedModalClose = () => {
    // Clear user data and redirect to home
    localStorage.removeItem("userId");
    localStorage.removeItem("eventId");
    localStorage.removeItem("userDocId");
    navigate("/");
  };

  const handleTimerExpired = async () => {
    if (!event) return;
    
    try {
      // If we're in a question phase, transition to results
      if (event.status === "question") {
        // Just signal results - AdminSettings will control the results display
        await setShowingResultsOnly(eventId, true);
      }
    } catch (error) {
      console.error("Error handling timer expiration:", error);
    }
  };

  useEffect(() => {
    // fetch room data
    const eventRef = doc(db, "events", eventId);

    const unsubscribeEvent = onSnapshot(eventRef, async (docSnap) => {
      if (docSnap.exists()) {
        const eventData = docSnap.data();
        setEvent(eventData);
        setError(null); // Clear error when event updates

        // GAME LOOP: If showingResultsOnly just became true, navigate to results
        // AdminSettings handles the status update
        if (eventData.showingResultsOnly && eventData.status === "results") {
          navigate(`/results/${eventId}`);
        }

        // GAME LOOP: If event status changes to "results" → show results
        if (eventData.status === "results" && !eventData.showingResultsOnly) {
          navigate(`/results/${eventId}`);
        }

        // GAME LOOP: If event status changes to "question" → mark for validation
        // But DON'T validate here - validation happens in a separate effect
        // This prevents expensive read operations in the listener
        if (eventData.status === "question") {
          const currentQuestionIndex = eventData.currentQuestionIndex;
          console.log("Question status detected. Index:", currentQuestionIndex, "Last index:", lastQuestionIndex);
          
          // Only trigger re-check if question index changed
          if (currentQuestionIndex !== lastQuestionIndex) {
            setLastQuestionIndex(currentQuestionIndex);
          }
        }
      } else {
        setEvent(null);
      }
    });

    // Listen to participants (new structure - more efficient than querying all users)
    const unsubscribeParticipants = listenToParticipants(eventId, (participants) => {
      const userId = localStorage.getItem("userId");
      
      // Check if current user is still in participants list
      // If not, they've been kicked by the admin
      if (userId) {
        const userExists = participants.some(p => p.id === userId);
        if (!userExists) {
          console.log("User has been kicked from the event");
          // Show kicked modal instead of immediately navigating
          setIsKicked(true);
          return;
        }
      }
      
      setPlayers(participants.map(p => ({
        id: p.id,
        username: p.name,
        ...p
      })));
    });

    return () => {
      unsubscribeEvent();
      unsubscribeParticipants();
    };
  }, [eventId, navigate]);

  // Separate effect for question validation - only runs when question index changes
  // This prevents expensive reads from firing on every event update
  useEffect(() => {
    if (!event || event.status !== "question" || lastQuestionIndex === null) {
      return;
    }

    const validateAndNavigate = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const question = await getCurrentEventQuestion(eventId, lastQuestionIndex);
        
        console.log("Question loaded:", question);
        
        if (!question) {
          // Question not found - show error on lobby
          setError(`Question not found (index: ${lastQuestionIndex}). Make sure the question ID exists in the database.`);
          console.log("Question is null, showing error");
          return;
        }

        // Check if user already answered this question
        const alreadyAnswered = await hasUserAnswered(eventId, userId, question.id);
        console.log("Already answered:", alreadyAnswered);
        
        if (!alreadyAnswered) {
          console.log("Navigating to game");
          navigate(`/game/${eventId}`);
        } else {
          console.log("User already answered, staying on lobby");
        }
      } catch (err) {
        console.error("Error validating question:", err);
        setError("Error loading question. Please check the database.");
      }
    };

    validateAndNavigate();
  }, [event?.status, lastQuestionIndex, eventId, navigate]);

  // Calculate time remaining for question phase (shown in lobby while waiting for results)
  useEffect(() => {
    if (!event || event.status !== "question") {
      setTimeLeft(0);
      return;
    }

    const updateTimeLeft = () => {
      const durationSeconds = event.questionTimerSeconds || 30;
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
    };

    // Update immediately
    updateTimeLeft();

    // Then update every 100ms for smooth display
    const interval = setInterval(updateTimeLeft, 100);

    return () => clearInterval(interval);
  }, [event?.status, event?.phaseStartedAt, event?.questionTimerSeconds]);

  // ⏳ loading state
  if (!event) return <p>Loading room...</p>;

  const userId = localStorage.getItem("userId");
  const userHasAnswered = players.find(p => p.id === userId)?.answered || false;

  return (
    <div>
      <h1>Lobby</h1>

      <p><strong>Room Name:</strong> {event.name}</p>
      <p><strong>Room Code:</strong> {event.code}</p>
      <p><strong>Status:</strong> {event.status}</p>

      {error && (
        <div className={styles.errorMessage}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Show appropriate message based on game state */}
      {event.status === "lobby" && (
        <div className={styles.statusMessage}>
          <p>Waiting for the admin to start the game...</p>
        </div>
      )}

      {event.status === "question" && (
        <div className={styles.statusMessage}>
          <p>Question in progress...</p>
          {userHasAnswered ? (
            <>
              <p className={styles.userAnsweredMessage}>✓ You have answered!</p>
              <p className={styles.timerText}>Results in: <span className={styles.timer}>{timeLeft}s</span></p>
            </>
          ) : (
            <p className={styles.waitingMessage}>Waiting for you to answer...</p>
          )}
        </div>
      )}

      {event.status === "results" && (
        <div className={styles.statusMessage}>
          <p>Results are being displayed...</p>
        </div>
      )}

      <EventQRCodeDisplay eventCode={event.code} />

      <UsersLobby users={players.map(p => ({ userId: p.id, name: p.username, avatar: p.avatar }))} />
      
      {/* Show answer progress when game is in question state */}
      {event.status === "question" && (
        <div className={styles.answerProgress}>
          <p className={styles.answerProgressText}>
            <strong>Answers:</strong> {players.filter(p => p.answered).length} / {players.length} participants
          </p>
        </div>
      )}

      <button onClick={handleLeave}>Leave Game</button>

      <KickedModal isOpen={isKicked} onClose={handleKickedModalClose} />
    </div>
  );
}
