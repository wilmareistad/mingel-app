/**
 * Batch Operations Service
 * 
 * Optimizes Firestore writes for high-volume scenarios
 * - Supports 100+ participants per event
 * - Multiple concurrent events
 * - No rate limiting with proper batching
 */

import {
  writeBatch,
  collection,
  doc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * ✅ OPTIMIZED: Batch reset all participants' answered status
 * Instead of 100 individual updateDoc calls, uses a single batch with up to 500 writes
 * 
 * @param {string} eventId - Event ID
 * @param {array} participants - Array of participants to reset
 * @returns {Promise<number>} Number of participants reset
 */
export async function batchResetParticipantsAnswered(eventId, participants = []) {
  if (!participants || participants.length === 0) {
    console.log("No participants to reset");
    return 0;
  }

  try {
    console.log(`batchResetParticipantsAnswered START: ${participants.length} participants`);

    // Firestore batches can have max 500 writes
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = participants.slice(i, i + batchSize);

      chunk.forEach((participant) => {
        const participantRef = doc(
          db,
          "events",
          eventId,
          "participants",
          participant.id
        );
        batch.update(participantRef, { hasAnswered: false });
      });

      batches.push(batch.commit());
    }

    await Promise.all(batches);
    console.log(
      `batchResetParticipantsAnswered COMPLETE: ${participants.length} participants reset`
    );
    return participants.length;
  } catch (error) {
    console.error("batchResetParticipantsAnswered ERROR:", error);
    throw error;
  }
}

/**
 * ✅ OPTIMIZED: Batch delete all answers for an event
 * Instead of reading then deleting each document individually,
 * batches the deletes into 500-write chunks
 * 
 * @param {string} eventId - Event ID
 * @returns {Promise<number>} Number of answers deleted
 */
export async function batchDeleteAnswersForEvent(eventId) {
  try {
    console.log(`batchDeleteAnswersForEvent START: ${eventId}`);

    const answersRef = collection(db, "events", eventId, "answers");
    const snapshot = await getDocs(answersRef);
    const docIds = snapshot.docs.map((d) => d.id);

    if (docIds.length === 0) {
      console.log("No answers to delete");
      return 0;
    }

    console.log(`Found ${docIds.length} answers to delete`);

    // Batch deletes in chunks of 500
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < docIds.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = docIds.slice(i, i + batchSize);

      chunk.forEach((docId) => {
        const docRef = doc(db, "events", eventId, "answers", docId);
        batch.delete(docRef);
      });

      batches.push(batch.commit());
    }

    await Promise.all(batches);
    console.log(`batchDeleteAnswersForEvent COMPLETE: ${docIds.length} answers deleted`);
    return docIds.length;
  } catch (error) {
    console.error("batchDeleteAnswersForEvent ERROR:", error);
    throw error;
  }
}

/**
 * ✅ OPTIMIZED: Batch delete answers by question ID
 * 
 * @param {string} eventId - Event ID
 * @param {string} questionId - Question ID to delete answers for
 * @returns {Promise<number>} Number of answers deleted
 */
export async function batchDeleteAnswersForQuestion(eventId, questionId) {
  try {
    console.log(`batchDeleteAnswersForQuestion START: ${eventId}, ${questionId}`);

    const answersRef = collection(db, "events", eventId, "answers");
    const q = query(answersRef, where("questionId", "==", questionId));
    const snapshot = await getDocs(q);
    const docIds = snapshot.docs.map((d) => d.id);

    if (docIds.length === 0) {
      console.log("No answers to delete for this question");
      return 0;
    }

    console.log(`Found ${docIds.length} answers to delete for question ${questionId}`);

    // Batch deletes in chunks of 500
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < docIds.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = docIds.slice(i, i + batchSize);

      chunk.forEach((docId) => {
        const docRef = doc(db, "events", eventId, "answers", docId);
        batch.delete(docRef);
      });

      batches.push(batch.commit());
    }

    await Promise.all(batches);
    console.log(
      `batchDeleteAnswersForQuestion COMPLETE: ${docIds.length} answers deleted`
    );
    return docIds.length;
  } catch (error) {
    console.error("batchDeleteAnswersForQuestion ERROR:", error);
    throw error;
  }
}

/**
 * ✅ OPTIMIZED: Batch delete all participants for an event
 * Used when deleting an entire event
 * 
 * @param {string} eventId - Event ID
 * @returns {Promise<number>} Number of participants deleted
 */
export async function batchDeleteAllParticipants(eventId) {
  try {
    console.log(`batchDeleteAllParticipants START: ${eventId}`);

    const participantsRef = collection(db, "events", eventId, "participants");
    const snapshot = await getDocs(participantsRef);
    const docIds = snapshot.docs.map((d) => d.id);

    if (docIds.length === 0) {
      console.log("No participants to delete");
      return 0;
    }

    console.log(`Found ${docIds.length} participants to delete`);

    // Batch deletes in chunks of 500
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < docIds.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = docIds.slice(i, i + batchSize);

      chunk.forEach((docId) => {
        const docRef = doc(db, "events", eventId, "participants", docId);
        batch.delete(docRef);
      });

      batches.push(batch.commit());
    }

    await Promise.all(batches);
    console.log(`batchDeleteAllParticipants COMPLETE: ${docIds.length} participants deleted`);
    return docIds.length;
  } catch (error) {
    console.error("batchDeleteAllParticipants ERROR:", error);
    throw error;
  }
}

/**
 * ✅ Parallel batch operations for multiple events
 * Executes batch operations for different events in parallel
 * to maximize throughput while staying under rate limits
 * 
 * @param {array} operations - Array of {eventId, operation, params}
 * @returns {Promise<array>} Results from each operation
 */
export async function parallelBatchOperations(operations) {
  try {
    console.log(`parallelBatchOperations START: ${operations.length} operations`);

    const promises = operations.map(async ({ eventId, operation, params }) => {
      switch (operation) {
        case "resetParticipants":
          return batchResetParticipantsAnswered(eventId, params.participants);
        case "deleteAnswers":
          return batchDeleteAnswersForEvent(eventId);
        case "deleteAnswersForQuestion":
          return batchDeleteAnswersForQuestion(eventId, params.questionId);
        case "deleteAllParticipants":
          return batchDeleteAllParticipants(eventId);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    });

    const results = await Promise.all(promises);
    console.log(`parallelBatchOperations COMPLETE:`, results);
    return results;
  } catch (error) {
    console.error("parallelBatchOperations ERROR:", error);
    throw error;
  }
}
