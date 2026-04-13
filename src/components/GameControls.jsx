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
        <button onClick={onNextQuestion}>
          Next Question
        </button>
        <button onClick={onEndQuestion}>
          End Question & Show Results
        </button>
        <button onClick={onResetGame}>
          Reset Game
        </button>
      </div>
    </div>
  );
}
