import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * Get a specific question by ID
 * @param {string} questionId - Question ID
 * @returns {Promise<object>} Question data with standardized format
 */
export async function getQuestion(questionId) {
  const questionRef = doc(db, "questions", questionId);
  const docSnap = await getDoc(questionRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      text: data.text,
      options: data.options || ["Agree", "Disagree"],
      category: data.category,
      ...data
    };
  }

  return null;
}

/**
 * Get the current question for an event
 * @param {string} eventId - Event ID
 * @param {number} questionIndex - Index of the question in the event's question list
 * @returns {Promise<object>} Current question data
 */
export async function getCurrentQuestion(eventId, questionIndex) {
  const eventRef = doc(db, "events", eventId);
  const eventSnap = await getDoc(eventRef);

  if (!eventSnap.exists()) {
    return null;
  }

  const eventData = eventSnap.data();
  const questions = eventData.questions || [];

  if (questionIndex >= questions.length) {
    return null;
  }

  const questionId = questions[questionIndex];
  return getQuestion(questionId);
}

/**
 * Get all questions for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<array>} Array of question data
 */
export async function getEventQuestions(eventId) {
  const eventRef = doc(db, "events", eventId);
  const eventSnap = await getDoc(eventRef);

  if (!eventSnap.exists()) {
    return [];
  }

  const eventData = eventSnap.data();
  const questionIds = eventData.questions || [];

  const questions = await Promise.all(
    questionIds.map(id => getQuestion(id))
  );

  return questions.filter(q => q !== null);
}

/**
 * Get questions by category
 * @param {string} category - Question category
 * @returns {Promise<array>} Array of questions
 */
export async function getQuestionsByCategory(category) {
  const questionsRef = collection(db, "questions");
  const q = query(questionsRef, where("category", "==", category));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      text: data.text,
      options: data.options || ["Agree", "Disagree"],
      category: data.category,
      ...data
    };
  });
}