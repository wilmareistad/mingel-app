import styles from "./ResultsControls.module.css";

/**
 * Results phase controls
 * Shows results with optional auto-advance countdown
 */
export default function ResultsControls({
  event,
  timeLeftDisplay,
  onNextQuestion,
  onEndGame,
  onResetGame,
}) {
  return (
    <div className={styles.section}>
      {event.showingResultsOnly ? (
        <>
          <p className={styles.resultsText}>
            Showing results for current question.
            {timeLeftDisplay > 0 && (
              <span> Auto-advancing in {timeLeftDisplay}</span>
            )}
          </p>
          <div className={styles.btnGroup}>
            <button className={styles.primaryBtn} onClick={onNextQuestion}>
              Next Question
            </button>
            <button className={styles.dangerBtn} onClick={onEndGame}>
              End Game
            </button>
            <button className={styles.ghostBtn} onClick={onResetGame}>
              Reset Game
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.resultsText}>
            Game finished. Results are displayed.
          </p>
          <div className={styles.btnGroup}>
            <button className={styles.ghostBtn} onClick={onResetGame}>
              Reset Game
            </button>
          </div>
        </>
      )}
    </div>
  );
}
