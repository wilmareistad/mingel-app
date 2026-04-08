import { useCallback } from "react";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import {
  resetParticipantsAnswered,
  setShowingResultsOnly,
  updateEventStatus,
  updateCurrentQuestionIndex,
  updateToQuestionPhase,
} from "../features/event/eventService";
import { deleteAnswersForEvent } from "../features/game/dataCleanup";

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

      // CRITICAL: Fetch fresh event data from Firestore
      // This ensures we always get the correct currentQuestionIndex
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      const currentEvent = eventSnap.data();

      if (!currentEvent) return;

      // Clear the "showing results only" flag
      await setShowingResultsOnly(eventId, false);

      // DELETE answers from previous question to prevent phantom votes
      await deleteAnswersForEvent(eventId);

      // Reset all participants answered status
      // ✅ Pass participants array if available to avoid extra read
      await resetParticipantsAnswered(
        eventId,
        participants.length > 0 ? participants : null
      );

      // Calculate total questions (public + custom)
      const totalQuestions =
        (currentEvent.questions?.length || 0) +
        (currentEvent.customQuestions?.length || 0);

      // Use the FRESH currentQuestionIndex from Firestore, not stale state
      const nextIndex = (currentEvent.currentQuestionIndex || 0) + 1;

      // Check if we've reached the end of all questions
      if (nextIndex >= totalQuestions) {
        // All questions done - show final results
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
      // ✅ Pass participants array to avoid extra getEventParticipants() read
      await resetParticipantsAnswered(eventId, participants);

      // Reset question index to start from first question
      await updateCurrentQuestionIndex(eventId, 0);
      await updateEventStatus(eventId, "question");
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
        await setShowingResultsOnly(eventId, false);
        await deleteAnswersForEvent(eventId);
        await updateCurrentQuestionIndex(eventId, 0);
        // ✅ Pass participants array if available to avoid extra read
        await resetParticipantsAnswered(
          eventId,
          participants.length > 0 ? participants : null
        );
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
