import styles from './ResultsDisplay.module.css';

/**
 * ResultsDisplay - Shows results with time until next question
 * Matches the styling of QuestionDisplay for consistency
 * @param {object} question - Question object with text
 * @param {number} currentIndex - Current question index (0-based)
 * @param {number} totalQuestions - Total number of questions
 * @param {string} timeLeft - Formatted time remaining (e.g., "2min 30s")
 */
export default function ResultsDisplay({ 
  question, 
  currentIndex, 
  totalQuestions,
  timeLeft 
}) {
  // Show even if question is missing, just with a placeholder
  const questionText = question?.text || "Question results";

  return (
    <div className={styles.currentQuestion}>
      <h3>Results ({currentIndex + 1}/{totalQuestions})</h3>
      <p className={styles.questionText}>{questionText}</p>
      
      <div className={styles.questionFooter}>
        <p className={styles.timeLeft}>
          Next question in: {timeLeft}
        </p>
      </div>
    </div>
  );
}
