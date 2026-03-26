import { collection, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * Get all available question IDs from the database
 * @returns {Promise<array>} Array of question IDs
 */
export async function getAllQuestionIds() {
  const questionsRef = collection(db, "questions");
  const snapshot = await getDocs(questionsRef);
  return snapshot.docs.map(doc => doc.id);
}

/**
 * Add all available questions to an event
 * @param {string} eventId - Event ID
 * @returns {Promise<number>} Number of questions added
 */
export async function addAllQuestionsToEvent(eventId) {
  const questionIds = await getAllQuestionIds();
  
  if (questionIds.length === 0) {
    throw new Error("No questions found in database");
  }

  // Set the questions array (replaces existing)
  await updateDoc(doc(db, "events", eventId), {
    questions: questionIds
  });

  return questionIds.length;
}

/**
 * Add specific questions to an event
 * @param {string} eventId - Event ID
 * @param {array} questionIds - Array of question IDs to add
 * @returns {Promise<void>}
 */
export async function addQuestionsToEvent(eventId, questionIds) {
  await updateDoc(doc(db, "events", eventId), {
    questions: questionIds
  });
}
