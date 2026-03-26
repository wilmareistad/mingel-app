import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentQuestion } from "../features/question/questionService";
import { getQuestionAnswers } from "../features/game/gameService";
import "./Results.css";

export default function Results() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const { event } = useEvent(eventId);
  const { user } = useUser();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!event) return;

    // If game is no longer in results state → go back to lobby
    if (event.status !== "results") {
      navigate(`/lobby/${eventId}`);
      return;
    }

    // Load current question and answers
    async function loadData() {
      try {
        const q = await getCurrentQuestion(
          event.id,
          event.currentQuestionIndex
        );
        setQuestion(q);

        if (q) {
          const allAnswers = await getQuestionAnswers(q.id);
          setAnswers(allAnswers);
        }
      } catch (error) {
        console.error("Error loading results:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [event, eventId, navigate]);

  if (loading) return <div>Loading results...</div>;
  if (!question) return <div>No question available</div>;

  // Count votes for each option
  const voteCounts = new Array(question.options.length).fill(0);
  answers.forEach((answer) => {
    if (answer.optionIndex >= 0 && answer.optionIndex < question.options.length) {
      voteCounts[answer.optionIndex]++;
    }
  });

  const totalVotes = answers.length;

  return (
    <div className="results-container">
      <div className="results-header">
        <h1>{question.text}</h1>
        <p className="results-subtitle">Results</p>
      </div>

      <div className="results-columns">
        {question.options.map((option, index) => {
          const voteCount = voteCounts[index];
          const percentage =
            totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <div key={index} className="results-column">
              <div className="results-dots">
                {answers.map((answer, answerIndex) => (
                  answer.optionIndex === index && (
                    <div
                      key={answerIndex}
                      className={`results-dot option-${index}`}
                    />
                  )
                ))}
              </div>

              <div className="results-label">
                <p className="results-percentage">{percentage}%</p>
                <p className="results-option">{option}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="results-footer">
        <p className="results-count">Total votes: {totalVotes}</p>
      </div>
    </div>
  );
}
