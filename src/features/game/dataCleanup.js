/**
 * Firestore Data Cleanup Script
 * 
 * This script removes test answers from your Firestore database.
 * Run this if you see phantom votes in results.
 * 
 * Usage:
 * - Import this and run the cleanup function
 * - Or use Firestore Console to manually delete documents
 */

import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * Delete all test answers for a specific question in an event
 * @param {string} eventId - Event ID
 * @param {string} questionId - The question to clean up (e.g., "q1")
 */
export async function deleteAnswersForQuestion(eventId, questionId) {
  try {
    const answersRef = collection(db, "events", eventId, "answers");
    const q = query(answersRef, where("questionId", "==", questionId));
    const snapshot = await getDocs(q);

    let deleted = 0;
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(db, "events", eventId, "answers", docSnapshot.id));
      deleted++;
    }

    console.log(`✅ Deleted ${deleted} answers for question ${questionId}`);
    return deleted;
  } catch (error) {
    console.error("❌ Error deleting answers:", error);
    throw error;
  }
}

/**
 * Delete all test answers for an event
 * @param {string} eventId - The event to clean up
 */
export async function deleteAnswersForEvent(eventId) {
  try {
    const answersRef = collection(db, "events", eventId, "answers");
    const snapshot = await getDocs(answersRef);

    let deleted = 0;
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(db, "events", eventId, "answers", docSnapshot.id));
      deleted++;
    }

    console.log(`✅ Deleted ${deleted} answers for event ${eventId}`);
    return deleted;
  } catch (error) {
    console.error("❌ Error deleting answers:", error);
    throw error;
  }
}

/**
 * Delete a specific answer document
 * @param {string} eventId - Event ID
 * @param {string} answerId - The answer document ID
 */
export async function deleteAnswer(eventId, answerId) {
  try {
    await deleteDoc(doc(db, "events", eventId, "answers", answerId));
    console.log(`✅ Deleted answer ${answerId}`);
  } catch (error) {
    console.error("❌ Error deleting answer:", error);
    throw error;
  }
}

/**
 * Get all answers for an event (for debugging)
 * @param {string} eventId - Event ID
 * @returns {Promise<array>} All answers for the event
 */
export async function getAllAnswersForEvent(eventId) {
  try {
    const answersRef = collection(db, "events", eventId, "answers");
    const snapshot = await getDocs(answersRef);
    
    const answers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${answers.length} total answers for event ${eventId}:`);
    answers.forEach(a => {
      console.log(`  - ${a.id}: Question ${a.questionId}, User ${a.userId}, Option ${a.optionIndex}`);
    });

    return answers;
  } catch (error) {
    console.error("❌ Error fetching answers:", error);
    throw error;
  }
}
