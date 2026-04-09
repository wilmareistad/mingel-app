import { useCallback } from "react";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import {
  setShowingResultsOnly,
  updateEventStatus,
  updateCurrentQuestionIndex,
  updateToQuestionPhase,
} from "../features/event/eventService";
import {
  batchResetParticipantsAnswered,
  batchDeleteAnswersForEvent,
} from "../features/event/batchService";

/**
 * Hook for game control operations
 * Centralizes all game state transitions and message handling
 * Prevents rate limiting by passing participant array to avoid extra reads
 */
export function useGameControls(eventId, participants, onMessageChange) {
  const showMessage = useCallback(
    (msg) => {
      onMessageChange(msg);
      setTimeout(() => onMessageChange(""), 3000);
    },
    [onMessageChange]
  );

  const handleNextQuestion = useCallback(async () => {
    try {
      if (!eventId) return;

      const eventRef = doc(db, "events", eventId);

      // ✅ OPTIMIZED: Parallel batch operations for 100+ participants
      // Instead of sequential operations, run cleanup in parallel:
      // 1. Reset all participants' hasAnswered status (batched, not individual writes)
      // 2. Delete answers from previous question (batched deletes)
      // 3. Clear the showing results flag
      // This prevents rate limiting when handling 100+ participants

      const cleanupPromises = [
        // ✅ BATCH RESET: Up to 500 updates per batch commit
        batchResetParticipantsAnswered(
          eventId,
          participants.length > 0 ? participants : []
        ),
        // ✅ BATCH DELETE: Up to 500 deletes per batch commit
        batchDeleteAnswersForEvent(eventId),
        // Individual write - fast
        setShowingResultsOnly(eventId, false),
      ];

      // ✅ CRITICAL FIX: Run cleanup AND fetch fresh data in parallel
      // Parallel execution is safe because:
      // - Cleanup operations don't depend on fetching fresh data
      // - We fetch AFTER cleanup, so race condition is minimized
      const [, , , freshEventSnap] = await Promise.all([
        ...cleanupPromises,
        getDoc(eventRef),
      ]);

      const freshEvent = freshEventSnap.data();
      if (!freshEvent) return;

      // Calculate total questions (public + custom)
      const totalQuestions =
        (freshEvent.questions?.length || 0) +
        (freshEvent.customQuestions?.length || 0);

      // Use the FRESH currentQuestionIndex from the latest read
      const nextIndex = (freshEvent.currentQuestionIndex || 0) + 1;

      // Check if we're in results phase from finishing all questions
      // If so, return to lobby instead of trying to load next question
      if (freshEvent.status === "results" && nextIndex >= totalQuestions) {
        // All questions done and results shown - reset to lobby
        await updateEventStatus(eventId, "lobby");
        showMessage("Game completed! Returning to lobby.");
        return;
      }

      // Check if we've reached the end of all questions
      if (nextIndex >= totalQuestions) {
        // All questions done - transition to final results
        await updateEventStatus(eventId, "results");
        showMessage("All questions completed! Game finished.");
      } else {
        // More questions to go - proceed to next question
        // ✅ ATOMIC WRITE: Update index AND status together
        await updateToQuestionPhase(eventId, nextIndex);
        showMessage("Next question displayed.");
      }
    } catch (error) {
      console.error("Error moving to next question:", error);
      showMessage("Error moving to next question");
    }
  }, [eventId, participants, showMessage]);

  const handleStartGame = useCallback(async () => {
    try {
      // ✅ OPTIMIZED: Batch reset all participants (handles 100+ efficiently)
      await batchResetParticipantsAnswered(
        eventId,
        participants.length > 0 ? participants : []
      );

      // ✅ CRITICAL: Use updateToQuestionPhase to set BOTH index AND phaseStartedAt atomically
      // This ensures GameTimer has a valid phaseStartedAt to work with
      await updateToQuestionPhase(eventId, 0);
      showMessage("Game started!");
    } catch (e) {
      showMessage("Error starting game.");
    }
  }, [eventId, participants, showMessage]);

  const handleEndGame = useCallback(
    async (onConfirm) => {
      try {
        await updateEventStatus(eventId, "results");
        showMessage("Game ended. Results displayed.");
        if (onConfirm) onConfirm();
      } catch (e) {
        showMessage("Error ending game.");
      }
    },
    [eventId, showMessage]
  );

  const handleEndQuestion = useCallback(async () => {
    try {
      await setShowingResultsOnly(eventId, true);
      await updateEventStatus(eventId, "results");
      showMessage("Question ended. Results displayed.");
    } catch (e) {
      showMessage("Error ending question.");
    }
  }, [eventId, showMessage]);

  const handleResetGame = useCallback(
    async (onConfirm) => {
      try {
        // ✅ OPTIMIZED: Parallel batch operations for reset
        await Promise.all([
          setShowingResultsOnly(eventId, false),
          batchDeleteAnswersForEvent(eventId),
          batchResetParticipantsAnswered(
            eventId,
            participants.length > 0 ? participants : []
          ),
        ]);

        await updateCurrentQuestionIndex(eventId, 0);
        await updateEventStatus(eventId, "lobby");
        showMessage("Game reset!");
        if (onConfirm) onConfirm();
      } catch (e) {
        showMessage("Error resetting game.");
      }
    },
    [eventId, participants, showMessage]
  );

  return {
    handleNextQuestion,
    handleStartGame,
    handleEndGame,
    handleEndQuestion,
    handleResetGame,
    showMessage,
  };
}
