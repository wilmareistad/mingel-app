import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentEventQuestion } from "../features/question/questionService";
import { getQuestionAnswers } from "../features/game/gameService";
import { useTheme } from "../hooks/useTheme";
import ResultsTimer from "../components/ResultsTimer";
import styles from "./Results.module.css";

export default function Results() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const { event } = useEvent(eventId);
  const { user } = useUser();

  // Apply theme based on event
  useTheme(event?.theme);

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Effect 1: Handle navigation away from results status
  useEffect(() => {
    if (!event) return;

    console.log("Results: Effect 1 running", {
      status: event.status,
      showingResultsOnly: event.showingResultsOnly
    });

    // If game is no longer in results state AND we're not showing results for just this question → go back to lobby
    if (event.status !== "results" && !event.showingResultsOnly) {
      console.log("Results: Navigating back to lobby");
      navigate(`/lobby/${eventId}`);
      return;
    }
  }, [event?.status, event?.showingResultsOnly, eventId, navigate]);

  // Effect 2: Load question and answers ONLY when currentQuestionIndex changes
  // Separate from navigation effect to prevent excessive reruns during timer updates
  useEffect(() => {
    console.log("Results: Effect 2 running", {
      hasEvent: !!event,
      status: event?.status,
      showingResultsOnly: event?.showingResultsOnly,
      currentQuestionIndex: event?.currentQuestionIndex
    });

    if (!event || event.status !== "results" || !event.showingResultsOnly) {
      console.log("Results: Skipping load - conditions not met");
      return;
    }

    // Load current question and answers
    async function loadData() {
      try {
        console.log("Results: Loading data for question index", event.currentQuestionIndex);
        const q = await getCurrentEventQuestion(
          event.id,
          event.currentQuestionIndex
        );
        console.log("Results: Question loaded", q);
        setQuestion(q);

        if (q) {
          const allAnswers = await getQuestionAnswers(eventId, q.id);
          console.log("Results: Answers loaded", allAnswers.length, "answers");
          setAnswers(allAnswers);
        }
      } catch (error) {
        console.error("Error loading results:", error);
      } finally {
        console.log("Results: Setting loading to false");
        setLoading(false);
      }
    }

    loadData();
  }, [event?.status, event?.currentQuestionIndex, event?.showingResultsOnly, eventId]);

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
      {/* Timer at the top */}
      <div className={styles.timerContainer}>
        <ResultsTimer 
          eventId={eventId}
          event={event}
        />
      </div>

      <div className={styles.resultsHeader}>
        <h1>{question.text}</h1>
        <p className={styles.resultsSubtitle}>Results</p>
      </div>

      <div 
        className={styles.resultsColumns}
        style={{
          '--answer-count': totalVotes,
        }}
      >
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
      </div>
    </div>
  );
}
