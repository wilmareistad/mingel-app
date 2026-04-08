import styles from "./LobbyControls.module.css";

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
  const totalQuestions =
    (event.questions?.length || 0) + (event.customQuestions?.length || 0);

  return (
    <div className={styles.section}>
      <div className={styles.questionsHeader}>
        <p className={styles.sectionLabel}>
          Questions ({totalQuestions})
        </p>
      </div>

      {allQuestions.length === 0 ? (
        <p className={styles.empty}>No questions selected.</p>
      ) : (
        <ol className={styles.questionsList}>
          {allQuestions.map((q) => (
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
