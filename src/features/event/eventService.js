import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * Listen to event changes in real-time
 * @param {string} eventId - Event ID
 * @param {function} callback - Called with event data when it changes
 * @returns {function} Unsubscribe function
 */
export function listenToEvent(eventId, callback) {
  const eventRef = doc(db, "events", eventId);

  const unsubscribe = onSnapshot(eventRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({
        id: docSnap.id,
        ...docSnap.data()
      });
    }
  });

  return unsubscribe;
}

/**
 * Update event status and phaseStartedAt timestamp
 * @param {string} eventId - Event ID
 * @param {string} status - New status (lobby, question, results, paused)
 */
export async function updateEventStatus(eventId, status) {
  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, {
    status,
    phaseStartedAt: serverTimestamp()
  });
}

/**
 * Update current question index
 * @param {string} eventId - Event ID
 * @param {number} questionIndex - Index of current question
 */
export async function updateCurrentQuestionIndex(eventId, questionIndex) {
  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, {
    currentQuestionIndex: questionIndex
  });
}
