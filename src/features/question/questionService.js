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
 * Get a custom question by ID from the customQuestions collection
 * @param {string} questionId - Custom Question ID
 * @returns {Promise<object>} Question data with standardized format
 */
export async function getCustomQuestion(questionId) {
  const questionRef = doc(db, "customQuestions", questionId);
  const docSnap = await getDoc(questionRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      text: data.text,
      options: data.options || ["Agree", "Disagree"],
      category: data.category,
      isCustom: true,
      ...data
    };
  }

  return null;
}

/**
 * Get the current question for an event based on event's question list
 * @param {string} eventId - Event ID
 * @param {number} questionIndex - Index within the event's question list (0-based)
 * @returns {Promise<object>} Current question data or null if not found
 */
export async function getCurrentEventQuestion(eventId, questionIndex) {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      console.warn("Event not found:", eventId);
      return null;
    }

    const eventData = eventSnap.data();
    // Combine public and custom questions
    const allQuestionIds = [
      ...(eventData.questions || []),
      ...(eventData.customQuestions || [])
    ];

    if (questionIndex < 0 || questionIndex >= allQuestionIds.length) {
      console.warn(`Question index ${questionIndex} out of range (${allQuestionIds.length} questions available)`);
      return null;
    }

    const questionId = allQuestionIds[questionIndex];
    
    // Try to fetch from public questions first
    let question = await getQuestion(questionId);
    
    // If not found in public, try custom questions
    if (!question) {
      question = await getCustomQuestion(questionId);
    }

    if (question) {
      return {
        ...question,
        totalQuestions: allQuestionIds.length,
        currentIndex: questionIndex
      };
    }

    console.error(`Question not found: ${questionId}`);
    return null;
  } catch (error) {
    console.error("Error in getCurrentEventQuestion:", error);
    return null;
  }
}

/**
 * Get the current question for an event
 * Fetches questions dynamically from the questions collection
 * @param {string} eventId - Event ID
 * @param {number} questionIndex - Index of the question (0-based)
 * @returns {Promise<object>} Current question data with metadata
 */
export async function getCurrentQuestion(eventId, questionIndex) {
  console.log("getCurrentQuestion called:", { eventId, questionIndex });
  
  // Get all questions from the questions collection, sorted by ID
  const questionsRef = collection(db, "questions");
  const snapshot = await getDocs(questionsRef);

  if (snapshot.empty) {
    console.warn("No questions found in database");
    return null;
  }

  const allQuestions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Sort by ID for consistent ordering
  allQuestions.sort((a, b) => a.id.localeCompare(b.id));

  console.log("All questions sorted by ID:", allQuestions.map(q => q.id));

  if (questionIndex >= allQuestions.length) {
    console.warn(`Question index ${questionIndex} out of range (${allQuestions.length} questions available)`);
    return null;
  }

  const question = allQuestions[questionIndex];
  console.log("Selected question at index", questionIndex, ":", question.id);
  
  return {
    id: question.id,
    text: question.text,
    options: question.options || ["Agree", "Disagree"],
    category: question.category,
    totalQuestions: allQuestions.length,
    currentIndex: questionIndex,
    ...question
  };
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
  // Combine public and custom question IDs
  const publicIds = eventData.questions || [];
  const customIds = eventData.customQuestions || [];

  const publicQuestions = await Promise.all(
    publicIds.map(id => getQuestion(id))
  );

  const customQuestions = await Promise.all(
    customIds.map(id => getCustomQuestion(id))
  );

  return [
    ...publicQuestions.filter(q => q !== null),
    ...customQuestions.filter(q => q !== null)
  ];
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