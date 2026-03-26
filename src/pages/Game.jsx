import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useEvent } from "../features/event/useEvent";
import { useUser } from "../features/user/useUser";
import { getCurrentQuestion } from "../features/question/questionService";
import { submitAnswer, hasUserAnswered } from "../features/game/gameService";
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
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);

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

    // Listen to active players
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("eventId", "==", eventId));
    const unsubscribePlayers = onSnapshot(q, (snapshot) => {
      setTotalPlayers(snapshot.docs.length);
    });

    // Listen to answers for the current question
    if (event.questions?.[event.currentQuestionIndex]) {
      const currentQuestionId = event.questions[event.currentQuestionIndex];
      const answersRef = collection(db, "answers");
      const answersQuery = query(answersRef, where("questionId", "==", currentQuestionId));
      
      const unsubscribeAnswers = onSnapshot(answersQuery, (snapshot) => {
        setAnswersCount(snapshot.docs.length);
      });

      return () => {
        unsubscribePlayers();
        unsubscribeAnswers();
      };
    }

    return () => {
      unsubscribePlayers();
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

      // Delay before checking if all have answered (give time for Firestore to update)
      setTimeout(async () => {
        try {
          // Get total active players
          const usersRef = collection(db, "users");
          const usersQuery = query(usersRef, where("eventId", "==", eventId));
          
          let totalUsers = 0;
          let answeredCount = 0;

          // Get snapshot of users
          const usersSnapshot = await new Promise((resolve) => {
            const unsub = onSnapshot(usersQuery, (snap) => {
              resolve(snap);
              unsub();
            });
          });
          
          totalUsers = usersSnapshot.docs.length;

          // Get current answer count
          const answersRef = collection(db, "answers");
          const answersQuery = query(answersRef, where("questionId", "==", question.id));
          
          const answersSnapshot = await new Promise((resolve) => {
            const unsub = onSnapshot(answersQuery, (snap) => {
              resolve(snap);
              unsub();
            });
          });
          
          answeredCount = answersSnapshot.docs.length;

          console.log(`Answers: ${answeredCount}/${totalUsers}`);

          // If all players have answered, transition to results
          if (answeredCount >= totalUsers && totalUsers > 0) {
            console.log("All players answered, transitioning to results");
            await updateDoc(doc(db, "events", eventId), {
              status: "results"
            });
          }
        } catch (error) {
          console.error("Error checking answer count:", error);
        }
      }, 500);

      // Delay before redirect (2.5 seconds)
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