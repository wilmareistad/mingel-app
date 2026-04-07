import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, setDoc, deleteDoc } from "firebase/firestore";
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
 * Update current question index AND transition to question status in a single operation
 * CRITICAL: This must be a single write so that phaseStartedAt is set at the same time
 * as currentQuestionIndex, preventing race conditions
 * @param {string} eventId - Event ID
 * @param {number} questionIndex - Index of current question
 */
export async function updateToQuestionPhase(eventId, questionIndex) {
  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, {
    currentQuestionIndex: questionIndex,
    status: "question",
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
export async function addParticipant(eventId, userId, username, avatar = null) {
  const participantRef = doc(db, "events", eventId, "participants", userId);
  console.log("addParticipant called:", { eventId, userId, username });
  
  const participantData = {
    name: username,
    joinedAt: serverTimestamp(),
    hasAnswered: false
  };
  
  // Add avatar configuration if provided
  if (avatar) {
    participantData.avatar = {
      baseIndex: avatar.baseIndex || 0,
      hairIndex: avatar.hairIndex || 0,
      eyeIndex: avatar.eyeIndex || 0,
      noseIndex: avatar.noseIndex || 0,
      mouthIndex: avatar.mouthIndex || 0,
      clothesIndex: avatar.clothesIndex || 0,
    };
  }
  
  await setDoc(participantRef, participantData, { merge: false }); // Don't merge - ensure clean creation
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
  console.log("🔴 updateParticipantAnswered START:", { 
    eventId, 
    userId, 
    hasAnswered, 
    docPath: participantRef.path,
    timestamp: new Date().toISOString()
  });
  
  try {
    await updateDoc(participantRef, {
      hasAnswered
    });
    console.log("🟢 updateParticipantAnswered SUCCESS:", { 
      eventId, 
      userId, 
      hasAnswered,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("🔴 updateParticipantAnswered FAILED:", { 
      eventId, 
      userId, 
      hasAnswered, 
      error: error.message,
      errorCode: error.code 
    });
    throw error;
  }
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
    console.log("listenToParticipants fired - participant count:", participants.length);
    console.log("listenToParticipants - hasAnswered breakdown:", participants.map(p => ({ id: p.id, name: p.name, hasAnswered: p.hasAnswered })));
    
    // Extra logging to see exact state of each participant
    participants.forEach(p => {
      console.log(`  Participant ${p.id} (${p.name}): hasAnswered=${p.hasAnswered}`);
    });
    
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

/**
 * Set whether we're showing results for just the current question without ending the game
 * Also starts the results timer countdown
 * @param {string} eventId - Event ID
 * @param {boolean} showingResultsOnly - Whether showing results without ending game
 */
export async function setShowingResultsOnly(eventId, showingResultsOnly) {
  const eventRef = doc(db, "events", eventId);
  
  if (showingResultsOnly) {
    // Starting results phase - set the phase timestamp
    await updateDoc(eventRef, {
      showingResultsOnly,
      resultsPhaseStartedAt: serverTimestamp()
    });
  } else {
    // Ending results phase
    await updateDoc(eventRef, {
      showingResultsOnly
    });
  }
}

/**
 * Update the timer duration for questions (in seconds)
 * @param {string} eventId - Event ID
 * @param {number} durationSeconds - Duration in seconds
 */
export async function updateTimerDuration(eventId, durationSeconds) {
  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, {
    questionTimerSeconds: durationSeconds
  });
}

/**
 * Update the timer duration for results display (in seconds)
 * @param {string} eventId - Event ID
 * @param {number} durationSeconds - Duration in seconds (default: 10 seconds)
 */
export async function updateResultsTimerDuration(eventId, durationSeconds = 10) {
  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, {
    resultsTimerSeconds: durationSeconds
  });
}

/**
 * Remove a participant from an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID to remove
 */
export async function removeParticipant(eventId, userId) {
  console.log("removeParticipant called with:", { eventId, userId, eventIdType: typeof eventId, userIdType: typeof userId });
  
  if (!eventId || !userId) {
    throw new Error(`Missing required parameters: eventId=${eventId}, userId=${userId}`);
  }
  
  console.log("Creating doc reference with path: events/" + eventId + "/participants/" + userId);
  const participantRef = doc(db, "events", eventId, "participants", userId);
  console.log("Deleting participant...");
  await deleteDoc(participantRef);
  console.log("Participant deleted successfully");
}
