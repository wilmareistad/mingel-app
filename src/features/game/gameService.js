import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * Submit an answer for a question
 * @param {string} eventId - Event ID
 * @param {string} questionId - Question ID
 * @param {number} optionIndex - Index of selected option
 * @param {string} userId - User ID
 * @returns {Promise<string>} Answer document ID
 */
export async function submitAnswer(eventId, questionId, optionIndex, userId) {
  const answersRef = collection(db, "answers");

  const docRef = await addDoc(answersRef, {
    eventId,
    questionId,
    userId,
    optionIndex,
    submittedAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Check if user has already answered a question
 * @param {string} userId - User ID
 * @param {string} questionId - Question ID
 * @returns {Promise<boolean>} True if user has already answered
 */
export async function hasUserAnswered(userId, questionId) {
  const answersRef = collection(db, "answers");
  const q = query(
    answersRef,
    where("userId", "==", userId),
    where("questionId", "==", questionId)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get all answers for a question
 * @param {string} questionId - Question ID
 * @returns {Promise<array>} Array of answers
 */
export async function getQuestionAnswers(questionId) {
  const answersRef = collection(db, "answers");
  const q = query(answersRef, where("questionId", "==", questionId));

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Calculate results for a question
 * @param {string} questionId - Question ID
 * @param {number} optionCount - Number of options in the question
 * @returns {Promise<array>} Array with vote counts for each option
 */
export async function calculateResults(questionId, optionCount) {
  const answers = await getQuestionAnswers(questionId);

  const results = new Array(optionCount).fill(0);

  answers.forEach(answer => {
    if (answer.optionIndex >= 0 && answer.optionIndex < optionCount) {
      results[answer.optionIndex]++;
    }
  });

  return results;
}
