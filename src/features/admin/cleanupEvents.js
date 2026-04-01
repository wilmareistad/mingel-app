import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { deleteAnswersForEvent } from "../game/dataCleanup";
import { resetParticipantsAnswered } from "../event/eventService";

/**
 * Clean up all events - reset them to a safe state
 * This fixes events that may have been corrupted by the quota exhaustion bug
 * @returns {Promise<{cleaned: number, errors: number}>}
 */
export async function cleanupAllEvents() {
  console.log("🧹 Starting event cleanup...");
  
  let cleaned = 0;
  let errors = 0;
  
  try {
    // Get all events
    const eventsRef = collection(db, "events");
    const snapshot = await getDocs(eventsRef);
    
    console.log(`Found ${snapshot.docs.length} events to cleanup`);
    
    for (const eventDoc of snapshot.docs) {
      try {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();
        
        console.log(`🔧 Cleaning up event: ${eventId} (status: ${eventData.status})`);
        
        // Step 1: Delete all answers for this event
        try {
          await deleteAnswersForEvent(eventId);
        } catch (err) {
          console.warn(`Could not delete answers for ${eventId}:`, err.message);
        }
        
        // Step 2: Reset all participants
        try {
          await resetParticipantsAnswered(eventId);
        } catch (err) {
          console.warn(`Could not reset participants for ${eventId}:`, err.message);
        }
        
        // Step 3: Reset event to lobby state
        const eventRef = doc(db, "events", eventId);
        await updateDoc(eventRef, {
          status: "lobby",
          currentQuestionIndex: 0,
          showingResultsOnly: false,
          phaseStartedAt: null,
          resultsPhaseStartedAt: null,
        });
        
        console.log(`✅ Cleaned: ${eventId}`);
        cleaned++;
      } catch (error) {
        console.error(`❌ Error cleaning event ${eventDoc.id}:`, error);
        errors++;
      }
    }
    
    console.log(`\n✅ Cleanup complete! Cleaned: ${cleaned}, Errors: ${errors}`);
    return { cleaned, errors };
  } catch (error) {
    console.error("❌ Fatal error during cleanup:", error);
    throw error;
  }
}

/**
 * Clean up a single event
 * @param {string} eventId - Event ID to clean up
 * @returns {Promise<void>}
 */
export async function cleanupSingleEvent(eventId) {
  console.log(`🧹 Cleaning up event: ${eventId}`);
  
  try {
    // Step 1: Delete all answers
    try {
      await deleteAnswersForEvent(eventId);
      console.log(`✅ Deleted answers for ${eventId}`);
    } catch (err) {
      console.warn(`Could not delete answers:`, err.message);
    }
    
    // Step 2: Reset participants
    try {
      await resetParticipantsAnswered(eventId);
      console.log(`✅ Reset participants for ${eventId}`);
    } catch (err) {
      console.warn(`Could not reset participants:`, err.message);
    }
    
    // Step 3: Reset event
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      status: "lobby",
      currentQuestionIndex: 0,
      showingResultsOnly: false,
      phaseStartedAt: null,
      resultsPhaseStartedAt: null,
    });
    
    console.log(`✅ Event cleaned successfully: ${eventId}`);
  } catch (error) {
    console.error(`❌ Error cleaning event:`, error);
    throw error;
  }
}

/**
 * Delete all events (destructive - use with caution!)
 * @returns {Promise<number>} Number of events deleted
 */
export async function deleteAllEvents() {
  console.log("⚠️ WARNING: Deleting ALL events!");
  
  let deleted = 0;
  
  try {
    const eventsRef = collection(db, "events");
    const snapshot = await getDocs(eventsRef);
    
    for (const eventDoc of snapshot.docs) {
      try {
        // First delete all answers and participants for this event
        await deleteAnswersForEvent(eventDoc.id);
        
        // Delete participants
        const participantsRef = collection(db, "events", eventDoc.id, "participants");
        const participantsSnap = await getDocs(participantsRef);
        
        for (const participantDoc of participantsSnap.docs) {
          await deleteDoc(participantDoc.ref);
        }
        
        // Delete custom questions
        const customQuestionsRef = collection(db, "events", eventDoc.id, "customQuestions");
        const customQuestionsSnap = await getDocs(customQuestionsRef);
        
        for (const customQuestionDoc of customQuestionsSnap.docs) {
          await deleteDoc(customQuestionDoc.ref);
        }
        
        // Finally delete the event itself
        await deleteDoc(eventDoc.ref);
        deleted++;
        
        console.log(`✅ Deleted event: ${eventDoc.id}`);
      } catch (error) {
        console.error(`❌ Error deleting event ${eventDoc.id}:`, error);
      }
    }
    
    console.log(`\n✅ Deleted ${deleted} events`);
    return deleted;
  } catch (error) {
    console.error("❌ Fatal error during deletion:", error);
    throw error;
  }
}
