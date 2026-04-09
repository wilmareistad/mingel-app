import { useState, useEffect } from "react";
import styles from "./LobbyControls.module.css";
import { getEventQuestions } from "../features/question/questionService";

/**
 * Lobby phase controls
 * Questions list with remove functionality, Start Game, and Delete Event
 */
export default function LobbyControls({
  event,
  allQuestions,
  onRemoveQuestion,
  onStartGame,
  onDeleteEvent,
}) {
  const [loadedQuestions, setLoadedQuestions] = useState([]);

  const totalQuestions =
    (event.questions?.length || 0) + (event.customQuestions?.length || 0);

  // Load full question data from event IDs
  useEffect(() => {
    if (!event?.id || totalQuestions === 0) {
      setLoadedQuestions([]);
      return;
    }

    const loadQuestions = async () => {
      try {
        const questions = await getEventQuestions(event.id);
        // Mark each question with its source (preset or custom)
        const questionsWithSource = questions.map((q) => ({
          ...q,
          source: event.customQuestions?.includes(q.id) ? 'custom' : 'preset',
        }));
        setLoadedQuestions(questionsWithSource);
      } catch (error) {
        console.error("Error loading questions:", error);
        setLoadedQuestions([]);
      }
    };

    loadQuestions();
  }, [event?.id, event?.customQuestions, totalQuestions]);

  const questionsToDisplay = loadedQuestions;

  return (
    <div className={styles.section}>
      <div className={styles.questionsHeader}>
        <p className={styles.sectionLabel}>
          Questions ({totalQuestions})
        </p>
      </div>

      {questionsToDisplay.length === 0 ? (
        <p className={styles.empty}>No questions selected.</p>
      ) : (
        <ol className={styles.questionsList}>
          {questionsToDisplay.map((q) => (
            <li key={q.id} className={styles.questionItem}>
              <span className={styles.questionText}>
                {q.text || q.id}
              </span>
              <button
                className={styles.removeQuestionBtn}
                onClick={() => onRemoveQuestion(q.id, q.source)}
                title="Remove question"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className={styles.finishRow}>
        <button className={styles.primaryBtn} onClick={onStartGame}>
          Start Game
        </button>
        <button className={styles.deleteEventBtn} onClick={onDeleteEvent}>
          🗑 Delete Event
        </button>
      </div>
    </div>
  );
}
