import { useEffect, useState, useRef } from "react";
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
import { listenToParticipants, setShowingResultsOnly, updateEventStatus } from "../features/event/eventService";
import { getCurrentEventQuestion } from "../features/question/questionService";
import { useTheme } from "../hooks/useTheme";
import { useAutoLeaveGame } from "../hooks/useAutoLeaveGame";
import { useAFKKick } from "../hooks/useAFKKick";
import UsersLobby from "./UsersLobby";
import EventQRCodeDisplay from "../components/QRCodeDisplay";
import KickedModal from "../components/KickedModal";
import EventDeletedModal from "../components/EventDeletedModal";
import GameTimer from "../components/GameTimer";
import NotFound from "./NotFound";
import EventGone from "./EventGone";
import styles from "./Lobby.module.css";

export default function Lobby() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const [eventNotFound, setEventNotFound] = useState(false);
  const [eventGone, setEventGone] = useState(false);
  const [eventDeleted, setEventDeleted] = useState(false);
  const [firstLoadComplete, setFirstLoadComplete] = useState(false);
  const [lastQuestionIndex, setLastQuestionIndex] = useState(null);
  const [isKicked, setIsKicked] = useState(false);
  const isKickedRef = useRef(false);

  // Check if user was kicked - this runs independently of other effects
  useEffect(() => {
    const checkKicked = async () => {
      if (isKickedRef.current) return; // Already kicked, don't check again
      
      const userId = sessionStorage.getItem("userId");
      if (!userId || !eventId) return;

      try {
        const participantDoc = await getDoc(doc(db, "events", eventId, "participants", userId));
        if (!participantDoc.exists()) {
          console.log("🚨 checkKicked: User is not in participants");
          isKickedRef.current = true;
          setIsKicked(true);
        }
      } catch (error) {
        console.warn("Error checking if kicked:", error);
      }
    };

    // Check immediately
    checkKicked();
    
    // Also check periodically in case of timing issues
    const interval = setInterval(checkKicked, 1000);
    
    return () => clearInterval(interval);
  }, [eventId]);

  // Apply theme based on event
  useTheme(event?.theme);

  // Auto-remove player when leaving event
  useAutoLeaveGame(eventId);

  // Auto-kick player if inactive for 15 minutes
  useAFKKick(eventId);

  const handleLeave = async () => {
    const userDocId = sessionStorage.getItem("userDocId");
    const userId = sessionStorage.getItem("userId");
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
      
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("eventId");
      sessionStorage.removeItem("userDocId");
    }
    navigate("/");
  };

  const handleKickedModalClose = () => {
    // Clear user data and redirect to home
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("eventId");
    sessionStorage.removeItem("userDocId");
    navigate("/");
  };

  const handleEventDeletedModalClose = () => {
    // Clear user data and redirect to home
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("eventId");
    sessionStorage.removeItem("userDocId");
    navigate("/");
  };

  const handleTimerExpired = async () => {
    if (!event) return;
    
    try {
      // If we're in a question phase, transition to results
      if (event.status === "question") {
        // Transition to results status (GameTimer fires and calls this)
        console.log("⏱️ handleTimerExpired: Updating event status to 'results' and enabling results display");
        await updateEventStatus(eventId, "results");
        // CRITICAL: Also enable results display so Results page will render
        await setShowingResultsOnly(eventId, true);
        console.log("✅ handleTimerExpired: Event status updated and results enabled");
      } else {
        console.log("⏱️ handleTimerExpired: Event status is", event.status, "- not transitioning");
      }
    } catch (error) {
      console.error("❌ Error handling timer expiration:", error);
    }
  };

  useEffect(() => {
    // Reset state when eventId changes
    setFirstLoadComplete(false);
    setEventNotFound(false);
    setEvent(null);
    
    // fetch room data
    const eventRef = doc(db, "events", eventId);

    const unsubscribeEvent = onSnapshot(eventRef, async (docSnap) => {
      setFirstLoadComplete(true);
      
      if (docSnap.exists()) {
        const eventData = docSnap.data();
        setEvent(eventData);
        setEventNotFound(false);
        setError(null); // Clear error when event updates

        // GAME LOOP: If event status changes to "results" → navigate to results page
        if (eventData.status === "results") {
          console.log("📍 Event status changed to 'results' - navigating to results page");
          navigate(`/results/${eventId}`);
        } else {
          console.log("📍 Event listener fired - status:", eventData.status);
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
        console.log("❌ Event not found");
        // Check the current event state to determine what happened
        setEvent((prevEvent) => {
          if (prevEvent) {
            // Event was loaded before, now it's deleted - show 410 page
            console.log("Event was deleted while user was viewing it - showing 410 Gone page");
            setTimeout(() => setEventGone(true), 0);
          } else {
            // Event never existed - navigate to 404
            console.log("Event never existed - navigating to 404");
            setTimeout(() => {
              setEventNotFound(true);
              navigate("/404");
            }, 0);
          }
          return null;
        });
      }
    });

    // Listen to participants (new structure - more efficient than querying all users)
    const unsubscribeParticipants = listenToParticipants(eventId, (participants) => {
      const userId = sessionStorage.getItem("userId");
      
      // Check if current user is still in participants list
      // If not, they've been kicked by the admin
      if (userId && !isKickedRef.current) {
        const userExists = participants.some(p => p.id === userId);
        if (!userExists) {
          console.log("🚨 User has been kicked from the event");
          // Mark as kicked using ref so it persists across effect reruns
          isKickedRef.current = true;
          setIsKicked(true);
        }
      }
      
      // Always update players, even if kicked
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
        const userId = sessionStorage.getItem("userId");
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

  const userId = sessionStorage.getItem("userId");
  const userHasAnswered = players.find(p => p.id === userId)?.answered || false;

  return (
    <div>
      {eventGone ? (
        <EventGone />
      ) : eventNotFound ? (
        <NotFound />
      ) : !firstLoadComplete || !event ? (
        <div className={styles.loading}>Loading room...</div>
      ) : (
        <>
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

          {event.status === "question" && event && (
            <div className={styles.timerContainer}>
              <GameTimer 
                eventId={eventId}
                event={event}
                onTimeExpired={handleTimerExpired}
                isActive={true}
              />
            </div>
          )}

          {event.status === "results" && (
            <div className={styles.statusMessage}>
              <p>Results are being displayed...</p>
            </div>
          )}

          <EventQRCodeDisplay eventCode={event.code} />

          <UsersLobby users={players.map(p => ({ userId: p.id, name: p.username, avatar: p.avatar, role: p.role }))} />
          
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
        </>
      )}
    </div>
  );
}
