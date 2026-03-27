import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentEventQuestion } from "../features/question/questionService";
import { getQuestionAnswers } from "../features/game/gameService";
import styles from "../styles/Results.module.css";

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

    // If game is no longer in results state AND we're not showing results for just this question → go back to lobby
    if (event.status !== "results" && !event.showingResultsOnly) {
      navigate(`/lobby/${eventId}`);
      return;
    }

    // Load current question and answers
    async function loadData() {
      try {
        const q = await getCurrentEventQuestion(
          event.id,
          event.currentQuestionIndex
        );
        setQuestion(q);

        if (q) {
          const allAnswers = await getQuestionAnswers(eventId, q.id);
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
    <div className={styles.resultsContainer}>
      <div className={styles.resultsHeader}>
        <h1>{question.text}</h1>
        <p className={styles.resultsSubtitle}>Results</p>
      </div>

      <div className={styles.resultsColumns}>
        {question.options.map((option, index) => {
          const voteCount = voteCounts[index];
          const percentage =
            totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <div key={index} className={styles.resultsColumn}>
              <div className={styles.resultsDots}>
                {answers.map((answer, answerIndex) => (
                  answer.optionIndex === index && (
                    <div
                      key={answerIndex}
                      className={`${styles.resultsDot} ${styles[`option${index}`]}`}
                    />
                  )
                ))}
              </div>

              <div className={styles.resultsLabel}>
                <p className={styles.resultsPercentage}>{percentage}%</p>
                <p className={styles.resultsOption}>{option}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.resultsFooter}>
        <p className={styles.resultsCount}>Total votes: {totalVotes}</p>
        
        {/* TEMP: Return to lobby button - remove when timer implemented */}
        <button 
          onClick={async () => {
            try {
              // Change status back to lobby so the listener redirects
              await updateDoc(doc(db, "events", eventId), {
                status: "lobby"
              });
              navigate(`/lobby/${eventId}`);
            } catch (error) {
              console.error("Error returning to lobby:", error);
            }
          }}
          style={{marginTop: "20px"}}
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
