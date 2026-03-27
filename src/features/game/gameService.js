import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { updateParticipantAnswered } from "../event/eventService";

/**
 * Submit an answer for a question
 * @param {string} eventId - Event ID
 * @param {string} questionId - Question ID
 * @param {number} optionIndex - Index of selected option
 * @param {string} userId - User ID
 * @returns {Promise<string>} Answer document ID
 */
export async function submitAnswer(eventId, questionId, optionIndex, userId) {
  console.log("submitAnswer called:", { eventId, questionId, userId, optionIndex });
  
  // Store in event-scoped answers sub-collection (NEW STRUCTURE)
  const answersRef = collection(db, "events", eventId, "answers");

  const docRef = await addDoc(answersRef, {
    questionId,
    userId,
    optionIndex,
    submittedAt: serverTimestamp()
  });

  console.log("Answer submitted to Firestore:", { answerId: docRef.id, eventId, questionId, userId, optionIndex });

  // Update participant's hasAnswered flag
  try {
    console.log("About to update participant answered flag:", { eventId, userId });
    await updateParticipantAnswered(eventId, userId, true);
    console.log("Participant answered flag updated successfully:", { eventId, userId });
  } catch (error) {
    console.error("ERROR updating participant answered status:", error);
    throw error;
  }

  return docRef.id;
}

/**
 * Check if user has already answered a question
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} questionId - Question ID
 * @returns {Promise<boolean>} True if user has already answered
 */
export async function hasUserAnswered(eventId, userId, questionId) {
  const answersRef = collection(db, "events", eventId, "answers");
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
 * @param {string} eventId - Event ID
 * @param {string} questionId - Question ID
 * @returns {Promise<array>} Array of answers
 */
export async function getQuestionAnswers(eventId, questionId) {
  const answersRef = collection(db, "events", eventId, "answers");
  const q = query(answersRef, where("questionId", "==", questionId));

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Calculate results for a question
 * @param {string} eventId - Event ID
 * @param {string} questionId - Question ID
 * @param {number} optionCount - Number of options in the question
 * @returns {Promise<array>} Array with vote counts for each option
 */
export async function calculateResults(eventId, questionId, optionCount) {
  const answers = await getQuestionAnswers(eventId, questionId);

  const results = new Array(optionCount).fill(0);

  answers.forEach(answer => {
    if (answer.optionIndex >= 0 && answer.optionIndex < optionCount) {
      results[answer.optionIndex]++;
    }
  });

  return results;
}
