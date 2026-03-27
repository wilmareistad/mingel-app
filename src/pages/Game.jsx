import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentEventQuestion } from "../features/question/questionService";
import { submitAnswer, hasUserAnswered } from "../features/game/gameService";
import { listenToParticipants, setShowingResultsOnly, updateEventStatus, resetParticipantsAnswered, updateCurrentQuestionIndex } from "../features/event/eventService";
import Timer from "../components/Timer";
import "./Game.css";

export default function Game() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const { event } = useEvent(eventId);
  const { user } = useUser();

  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);

  // Handle timer expiration: auto-transition to results
  const handleTimerExpired = async () => {
    if (!event || !question) return;
    
    try {
      // Set showing results only flag and transition to results state
      await setShowingResultsOnly(eventId, true);
      await updateEventStatus(eventId, "results");
      
      // Set a timer to auto-advance after 2 minutes (120 seconds)
      setTimeout(async () => {
        try {
          await setShowingResultsOnly(eventId, false);
          
          // Fetch the current event to get fresh data
          const eventRef = doc(db, "events", eventId);
          const eventSnap = await getDoc(eventRef);
          const currentEvent = eventSnap.data();
          
          if (currentEvent) {
            // Move to next question or end game
            const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;
            if (currentEvent.questions && nextIndex < currentEvent.questions.length) {
              await resetParticipantsAnswered(eventId);
              await updateCurrentQuestionIndex(eventId, nextIndex);
              await updateEventStatus(eventId, "question");
            } else {
              // Game ended - go back to lobby
              await updateEventStatus(eventId, "lobby");
            }
          }
        } catch (error) {
          console.error("Error auto-advancing after results:", error);
        }
      }, 120000); // 2 minutes
    } catch (error) {
      console.error("Error handling timer expiration:", error);
    }
  };

  useEffect(() => {
    if (!event) return;

    // If game is no longer in question state → go back to lobby
    if (event.status !== "question") {
      navigate(`/lobby/${eventId}`);
      return;
    }

    // Load current question
    async function loadQuestion() {
      try {
        const q = await getCurrentEventQuestion(
          event.id,
          event.currentQuestionIndex
        );
        setQuestion(q);

        // If question not found, redirect back to lobby
        if (!q) {
          console.warn("Question not found, redirecting to lobby");
          navigate(`/lobby/${eventId}`);
          return;
        }

        // Check if user already answered this question
        if (user && q) {
          const alreadyAnswered = await hasUserAnswered(eventId, user.id, q.id);
          setAnswered(alreadyAnswered);
        }
      } catch (error) {
        console.error("Error loading question:", error);
        // Redirect to lobby on error
        navigate(`/lobby/${eventId}`);
      } finally {
        setLoading(false);
      }
    }

    loadQuestion();

    // Listen to participants (new structure for checking who answered)
    const unsubscribeParticipants = listenToParticipants(eventId, (participants) => {
      setParticipants(participants);
    });

    return () => {
      unsubscribeParticipants();
    };
  }, [event, user, eventId, navigate]);

  async function handleAnswer(optionIndex) {
    if (answered || !question || !user || !event) return;

    try {
      // Show the selected option
      setSelectedOptionIndex(optionIndex);
      
      // Submit answer
      await submitAnswer(
        event.id,
        question.id,
        optionIndex,
        user.id
      );

      // Mark as answered
      setAnswered(true);

      // Delay before redirect back to lobby (2.5 seconds)
      setTimeout(() => {
        navigate(`/lobby/${eventId}`);
      }, 2500);
    } catch (error) {
      console.error("Error submitting answer:", error);
      // Reset on error
      setSelectedOptionIndex(null);
    }
  }

  if (loading) return <div>Loading question...</div>;
  if (!question) return <div>No question available</div>;

  return (
    <div className="game-container">
      <div style={{fontSize: "14px", color: "#666", marginBottom: "10px"}}>
        Question {(question.currentIndex || 0) + 1} of {question.totalQuestions || '?'}
      </div>

      {/* Timer */}
      {event && (
        <div style={{marginBottom: "20px"}}>
          <Timer 
            eventId={eventId}
            event={event}
            onTimeExpired={handleTimerExpired}
            isActive={true}
          />
        </div>
      )}

      <h1>{question.text}</h1>

      <div className="answer-buttons">
        {question.options.map((option, index) => (
          <button
            key={index}
            className={`answer-button ${
              answered && selectedOptionIndex === index ? "selected" : ""
            } ${answered && selectedOptionIndex !== index ? "hidden" : ""}`}
            onClick={() => handleAnswer(index)}
            disabled={answered}
          >
            {option}
          </button>
        ))}
      </div>

      {answered && (
        <div className="confirmation-message">
          <p>✓ Your answer has been registered!</p>
        </div>
      )}
    </div>
  );
}