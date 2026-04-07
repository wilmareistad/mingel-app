import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentEventQuestion } from "../features/question/questionService";
import { submitAnswer, hasUserAnswered } from "../features/game/gameService";
import { listenToParticipants, setShowingResultsOnly } from "../features/event/eventService";
import GameTimer from "../components/GameTimer";
import KickedModal from "../components/KickedModal";
import styles from "./Game.module.css";

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
  const [isKicked, setIsKicked] = useState(false);

  // Handle timer expiration: transition to results
  // DO NOT auto-advance here - let Lobby handle all advancement
  // This ensures single source of truth: Admin Dashboard
  const handleTimerExpired = async () => {
    if (!event || !question) return;
    
    try {
      // Transition to results state
      // setShowingResultsOnly(true) will set resultsPhaseStartedAt for results timing
      // The Lobby component will handle updating status and auto-advancing
      await setShowingResultsOnly(eventId, true);
    } catch (error) {
      console.error("Error handling timer expiration:", error);
    }
  };

  const handleKickedModalClose = () => {
    // Clear user data and redirect to home
    localStorage.removeItem("userId");
    localStorage.removeItem("eventId");
    localStorage.removeItem("userDocId");
    navigate("/");
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
        console.log("Loading question for event:", eventId);
        console.log("Current question index:", event.currentQuestionIndex);
        console.log("Event data:", event);
        
        const q = await getCurrentEventQuestion(
          event.id,
          event.currentQuestionIndex
        );
        
        console.log("Loaded question:", q);
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
  if (!question) {
    return (
      <div className={styles.gameContainer}>
        <div className={styles.errorContainer}>
          <h2>⚠️ Question Not Found</h2>
          <p>Unable to load the current question.</p>
          {event && (
            <>
              <p><strong>Debug Info:</strong></p>
              <p>Event ID: {eventId}</p>
              <p>Current Question Index: {event.currentQuestionIndex}</p>
              <p>Status: {event.status}</p>
              <p>Total Questions: {event.questions?.length || 0} public + {event.customQuestions?.length || 0} custom</p>
            </>
          )}
          <button onClick={() => navigate(`/lobby/${eventId}`)}>
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
      <div className={styles.questionCounter}>
        Question {(question.currentIndex || 0) + 1} of {question.totalQuestions || '?'}
      </div>

      {/* Timer */}
      {event && (
        <div className={styles.timerWrapper}>
          <GameTimer 
            eventId={eventId}
            event={event}
            onTimeExpired={handleTimerExpired}
            isActive={true}
          />
        </div>
      )}

      <h1>{question.text}</h1>

      <div className={styles.answerButtons}>
        {question.options.map((option, index) => (
          <button
            key={index}
            className={`${styles.answerButton} ${
              answered && selectedOptionIndex === index ? styles.selected : ""
            } ${answered && selectedOptionIndex !== index ? styles.hidden : ""}`}
            onClick={() => handleAnswer(index)}
            disabled={answered}
          >
            {option}
          </button>
        ))}
      </div>

      {answered && (
        <div className={styles.confirmationMessage}>
          <p>✓ Your answer has been registered!</p>
        </div>
      )}

      <KickedModal isOpen={isKicked} onClose={handleKickedModalClose} />
    </div>
  );
}