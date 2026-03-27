import styles from './QuestionDisplay.module.css';

/**
 * QuestionDisplay - Shows current question with vote count and time remaining
 * @param {object} question - Question object with text and options
 * @param {number} currentIndex - Current question index (0-based)
 * @param {number} totalQuestions - Total number of questions
 * @param {number} votes - Number of votes received
 * @param {number} totalParticipants - Total number of participants
 * @param {string} timeLeft - Formatted time remaining (e.g., "2min 30s")
 */
export default function QuestionDisplay({ 
  question, 
  currentIndex, 
  totalQuestions,
  votes,
  totalParticipants,
  timeLeft 
}) {
  if (!question) return null;

  return (
    <div className={styles.currentQuestion}>
      <h3>Current Question ({currentIndex + 1}/{totalQuestions})</h3>
      <p className={styles.questionText}>{question.text}</p>
      
      <div className={styles.questionFooter}>
        <p className={styles.voteCount}>
          Votes: {votes} / {totalParticipants}
        </p>
        {timeLeft && (
          <p className={styles.timeLeft}>
            Time left: {timeLeft}
          </p>
        )}
      </div>
    </div>
  );
}
