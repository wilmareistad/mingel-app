 import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
 import { db } from "../../services/firebase";
 import { nanoid } from "nanoid";/**
 * Create a custom question for an event
 * @param {string} eventId - The event ID
 * @param {string} text - Question text
 * @param {string} category - Question category
 * @param {array} options - Array of answer options (["Agree", "Disagree"])
 * @param {string} createdBy - Admin ID who created the question
 * @returns {Promise<string>} - Returns the custom question ID
 */
export async function createCustomQuestion(eventId, text, category, options, createdBy) {
  try {
    const customQuestionsRef = collection(db, "customQuestions");
    
    const docRef = await addDoc(customQuestionsRef, {
      eventId,
      text,
      category,
      options,
      createdBy,
      createdAt: serverTimestamp(),
    });

    console.log(`✅ Created custom question: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating custom question:", error);
    throw error;
  }
}

/**
 * Get all custom questions for an event
 * @param {string} eventId - The event ID
 * @returns {Promise<array>} - Array of custom questions
 */
export async function getCustomQuestionsForEvent(eventId) {
  try {
    const q = query(
      collection(db, "customQuestions"),
      where("eventId", "==", eventId)
    );
    
    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ Fetched ${questions.length} custom questions for event ${eventId}`);
    return questions;
  } catch (error) {
    console.error("❌ Error fetching custom questions:", error);
    throw error;
  }
}

/**
 * Delete a custom question
 * @param {string} questionId - The custom question ID
 */
export async function deleteCustomQuestion(questionId) {
  try {
    await deleteDoc(doc(db, "customQuestions", questionId));
    console.log(`✅ Deleted custom question: ${questionId}`);
  } catch (error) {
    console.error("❌ Error deleting custom question:", error);
    throw error;
  }
}

/**
 * Delete all custom questions for an event
 * @param {string} eventId - The event ID
 */
export async function deleteCustomQuestionsForEvent(eventId) {
  try {
    const q = query(
      collection(db, "customQuestions"),
      where("eventId", "==", eventId)
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
    console.log(`✅ Deleted all custom questions for event ${eventId}`);
  } catch (error) {
    console.error("❌ Error deleting custom questions:", error);
    throw error;
  }
}
