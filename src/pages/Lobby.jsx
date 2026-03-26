import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { hasUserAnswered } from "../features/game/gameService";
import { listenToParticipants, resetParticipantsAnswered } from "../features/event/eventService";
import { deleteAnswersForEvent } from "../features/game/dataCleanup";
import { getCurrentQuestion } from "../features/question/questionService";
import { debugQuestions } from "../features/question/debugQuestions";
import UsersLobby from "../components/UsersLobby";
import EventQRCode from "../components/QRCode";

export default function Lobby() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    // fetch room data
    const eventRef = doc(db, "events", eventId);

    const unsubscribeEvent = onSnapshot(eventRef, async (docSnap) => {
      if (docSnap.exists()) {
        const eventData = docSnap.data();
        setEvent(eventData);
        setError(null); // Clear error when event updates

        // GAME LOOP: If event status changes to "results" → show results
        if (eventData.status === "results") {
          navigate(`/results/${eventId}`);
        }

        // GAME LOOP: If event status changes to "question" AND user hasn't answered yet
        // redirect to game (but first validate the question exists)
        if (eventData.status === "question") {
          const userId = localStorage.getItem("userId");
          const currentQuestionIndex = eventData.currentQuestionIndex;
          
          console.log("Question status detected. Index:", currentQuestionIndex, "User:", userId);
          
          // Validate question exists before navigating
          if (userId && currentQuestionIndex !== undefined) {
            try {
              const question = await getCurrentQuestion(eventId, currentQuestionIndex);
              
              console.log("Question loaded:", question);
              
              if (!question) {
                // Question not found - show error on lobby
                setError(`Question not found (index: ${currentQuestionIndex}). Make sure the question ID exists in the database.`);
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
          }
        }
      } else {
        setEvent(null);
      }
    });

    // Listen to participants (new structure - more efficient than querying all users)
    const unsubscribeParticipants = listenToParticipants(eventId, (participants) => {
      console.log("Participants updated:", participants);
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

  // ⏳ loading state
  if (!event) return <p>Loading room...</p>;

  // Test buttons to trigger results (development only)
  const handleTestResults = async () => {
    try {
      // Just transition to results without auto-submitting an answer
      await updateDoc(doc(db, "events", eventId), {
        status: "results"
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
    }
  };

  const handleCleanupAnswers = async () => {
    if (!window.confirm("Delete all answers for this event? This cannot be undone.")) {
      return;
    }
    
    try {
      const deleted = await deleteAnswersForEvent(eventId);
      alert(`Deleted ${deleted} answers`);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleTestQuestion = async () => {
    try {
      // First, ensure all participants have a hasAnswered field set to false
      console.log("Resetting participants...");
      await resetParticipantsAnswered(eventId);
      console.log("Participants reset completed");
      
      // Also clean up old answers from this question so users can answer again
      await deleteAnswersForEvent(eventId);
      
      // Transition to question status
      await updateDoc(doc(db, "events", eventId), {
        status: "question"
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
    }
  };

  const handleDebug = async () => {
    try {
      const questions = await debugQuestions();
      alert(`Debug info logged to console. ${questions.length} questions found.`);
    } catch (error) {
      console.error("Debug error:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <div>
      <h1>Lobby</h1>

      <p><strong>Room Name:</strong> {event.name}</p>
      <p><strong>Room Code:</strong> {event.code}</p>
      <p><strong>Status:</strong> {event.status}</p>

      {error && (
        <div style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "12px",
          borderRadius: "4px",
          marginTop: "20px",
          border: "1px solid #f5c6cb"
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <EventQRCode eventCode={event.code} />

      <UsersLobby users={players.map(p => ({ userId: p.id, name: p.username }))} />
      
      {/* Show answer progress when game is in question state */}
      {event.status === "question" && (
        <div style={{marginTop: "20px", padding: "12px", backgroundColor: "#e7f3ff", borderRadius: "6px"}}>
          <p style={{margin: "0"}}>
            <strong>Answers:</strong> {players.filter(p => p.hasAnswered).length} / {players.length} participants
            {players.length > 0 && (
              <span style={{fontSize: "12px", marginLeft: "12px"}}>
                ({players.map(p => `${p.name}:${p.hasAnswered}`).join(", ")})
              </span>
            )}
          </p>
        </div>
      )}
      
      {/* Development: Test buttons */}
      <button onClick={handleTestQuestion} style={{marginTop: "20px"}}>
        TEST: Trigger Question
      </button>
      
      <button onClick={handleTestResults} style={{marginTop: "12px"}}>
        TEST: Trigger Results
      </button>
      
      <button onClick={handleDebug} style={{marginTop: "12px", background: "#6c757d"}}>
        DEBUG: Check Questions (see console)
      </button>
      
      <button onClick={handleCleanupAnswers} style={{marginTop: "12px", background: "#dc3545"}}>
        CLEANUP: Delete All Answers
      </button>

      <button onClick={handleLeave}>Leave Game</button>
    </div>
  );
}
