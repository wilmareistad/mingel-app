import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentQuestion } from "../features/question/questionService";
import { submitAnswer, hasUserAnswered } from "../features/game/gameService";

export default function Game() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const { event } = useEvent(eventId);
  const { user } = useUser();

  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);

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

        // Check if user already answered this question
        if (user && q) {
          const alreadyAnswered = await hasUserAnswered(user.id, q.id);
          setAnswered(alreadyAnswered);
        }
      } catch (error) {
        console.error("Error loading question:", error);
      } finally {
        setLoading(false);
      }
    }

    loadQuestion();
  }, [event, user, eventId, navigate]);

  async function handleAnswer(optionIndex) {
    if (answered || !question || !user || !event) return;

    try {
      await submitAnswer(
        event.id,
        question.id,
        optionIndex,
        user.id
      );

      setAnswered(true);
      navigate(`/lobby/${eventId}`);
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  }

  if (loading) return <div>Loading question...</div>;
  if (!question) return <div>No question available</div>;

  return (
    <div>
      <h1>{question.text}</h1>

      <div>
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={answered}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}