import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, setDoc } from "firebase/firestore";
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

/**
 * Add a participant to an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} username - User's display name
 */
export async function addParticipant(eventId, userId, username) {
  const participantRef = doc(db, "events", eventId, "participants", userId);
  console.log("addParticipant called:", { eventId, userId, username });
  await setDoc(participantRef, {
    name: username,
    joinedAt: serverTimestamp(),
    hasAnswered: false
  }, { merge: false }); // Don't merge - ensure clean creation
  console.log("addParticipant completed:", { eventId, userId });
}

/**
 * Update participant's answered status for current question
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {boolean} hasAnswered - Whether user has answered
 */
export async function updateParticipantAnswered(eventId, userId, hasAnswered) {
  const participantRef = doc(db, "events", eventId, "participants", userId);
  console.log("updateParticipantAnswered called:", { eventId, userId, hasAnswered });
  await updateDoc(participantRef, {
    hasAnswered
  });
  console.log("updateParticipantAnswered completed");
}

/**
 * Get all participants in an event
 * @param {string} eventId - Event ID
 * @returns {Promise<array>} Array of participants
 */
export async function getEventParticipants(eventId) {
  const participantsRef = collection(db, "events", eventId, "participants");
  const snapshot = await getDocs(participantsRef);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Listen to event participants in real-time
 * @param {string} eventId - Event ID
 * @param {function} callback - Called with array of participants
 * @returns {function} Unsubscribe function
 */
export function listenToParticipants(eventId, callback) {
  const participantsRef = collection(db, "events", eventId, "participants");

  const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
    const participants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log("listenToParticipants fired:", participants);
    callback(participants);
  });

  return unsubscribe;
}

/**
 * Listen to admin's events in real-time
 * @param {string} adminId - Admin user ID
 * @param {function} callback - Called with array of events when they change
 * @returns {function} Unsubscribe function
 */
export function listenToAdminEvents(adminId, callback) {
  const eventsRef = collection(db, "events");
  const q = query(eventsRef, where("adminId", "==", adminId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(events);
  });

  return unsubscribe;
}

/**
 * Ensure all participants have hasAnswered field initialized
 * This prevents race conditions where documents might not have the field
 * @param {string} eventId - Event ID
 */
export async function ensureParticipantsInitialized(eventId) {
  try {
    console.log("ensureParticipantsInitialized START:", { eventId });
    const participants = await getEventParticipants(eventId);
    
    const initPromises = participants.map(participant => {
      if (participant.hasAnswered === undefined || participant.hasAnswered === null) {
        console.log("Initializing hasAnswered for participant:", participant.id);
        return updateParticipantAnswered(eventId, participant.id, false);
      }
      return Promise.resolve();
    });
    
    await Promise.all(initPromises);
    console.log("ensureParticipantsInitialized COMPLETE");
  } catch (error) {
    console.error("ensureParticipantsInitialized ERROR:", error);
    throw error;
  }
}

/**
 * Reset all participants' answered status (when starting new question)
 * @param {string} eventId - Event ID
 */
export async function resetParticipantsAnswered(eventId) {
  try {
    console.log("resetParticipantsAnswered START:", { eventId });
    
    // First ensure all participants are initialized
    await ensureParticipantsInitialized(eventId);
    
    const participants = await getEventParticipants(eventId);
    console.log("resetParticipantsAnswered found participants:", participants.length, participants.map(p => p.id));
    
    const updatePromises = participants.map(participant => {
      console.log("Resetting participant:", participant.id);
      return updateParticipantAnswered(eventId, participant.id, false);
    });
    
    await Promise.all(updatePromises);
    console.log("resetParticipantsAnswered COMPLETE:", { eventId, participantCount: participants.length });
  } catch (error) {
    console.error("resetParticipantsAnswered ERROR:", error);
    throw error;
  }
}
