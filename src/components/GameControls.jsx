import QuestionDisplay from "./QuestionDisplay";
import styles from "./GameControls.module.css";

/**
 * Question phase controls
 * Question display + action buttons during a question
 */
export default function GameControls({
  event,
  currentQuestion,
  voteCount,
  totalParticipants,
  timeLeftDisplay,
  onNextQuestion,
  onEndQuestion,
  onEndGame,
  onResetGame,
}) {
  const totalQuestions =
    (event.questions?.length || 0) + (event.customQuestions?.length || 0);

  return (
    <div className={styles.section}>
      <QuestionDisplay
        question={currentQuestion}
        currentIndex={event?.currentQuestionIndex || 0}
        totalQuestions={totalQuestions}
        votes={voteCount}
        totalParticipants={totalParticipants}
        timeLeft={timeLeftDisplay}
      />
      <div className={styles.btnGroup}>
        <button className={styles.primaryBtn} onClick={onNextQuestion}>
          Next Question
        </button>
        <button className={styles.secondaryBtn} onClick={onEndQuestion}>
          End Question & Show Results
        </button>
        <button className={styles.dangerBtn} onClick={onEndGame}>
          End Game
        </button>
        <button className={styles.ghostBtn} onClick={onResetGame}>
          Reset Game
        </button>
      </div>
    </div>
  );
}
