import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentQuestion } from "../features/question/questionService";
import { submitAnswer, hasUserAnswered } from "../features/game/gameService";
import { listenToParticipants } from "../features/event/eventService";
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
        const q = await getCurrentQuestion(
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