import ResultsDisplay from "./ResultsDisplay";
import styles from "./ResultsControls.module.css";

/**
 * Results phase controls
 * Shows results with optional auto-advance countdown
 */
export default function ResultsControls({
  event,
  currentQuestion,
  currentIndex,
  totalQuestions,
  timeLeftDisplay,
  onNextQuestion,
  onResetGame,
}) {
  return (
    <div className={styles.section}>
      {event.showingResultsOnly ? (
        <>
          <ResultsDisplay
            question={currentQuestion}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            timeLeft={timeLeftDisplay}
          />
          <div className={styles.btnGroup}>
            <button className={styles.primaryBtn} onClick={onNextQuestion}>
              Next Question
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
