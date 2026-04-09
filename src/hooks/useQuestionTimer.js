import { useState, useEffect, useRef, useCallback } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Hook for question phase countdown timer
 * Auto-transitions to results phase when timer expires
 * Uses useRef guard to prevent duplicate DB writes
 * Only reads from event listener data (no DB reads inside interval)
 */
export function useQuestionTimer(event, eventId, onTimeExpired) {
  const [timeLeft, setTimeLeft] = useState(0);
  const timerExpiredRef = useRef(false);
  const phaseIdRef = useRef(null);

  // Auto-transition to results when timer expires
  useEffect(() => {
    if (!event || event.status !== "question") {
      setTimeLeft(0);
      timerExpiredRef.current = false;
      return;
    }

    const updateTimeLeft = () => {
      const durationSeconds = event.questionTimerSeconds || 30;
      const questionPhaseStartedAt =
        event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;

      if (!questionPhaseStartedAt) {
        setTimeLeft(durationSeconds);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - questionPhaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      setTimeLeft(remaining);

      // ✅ SAFE: Auto-transition when timer expires
      // Uses useRef guard to prevent duplicate fires
      // Uses event data from listener (no DB read inside loop)
      // Additional safety: Only transition if duration is positive
      if (remaining === 0 && !timerExpiredRef.current && durationSeconds > 0) {
        timerExpiredRef.current = true;
        console.log("⏰ QUESTION TIMER EXPIRED - transitioning to results");

        // Atomic write: transition to results phase
        const eventRef = doc(db, "events", eventId);
        updateDoc(eventRef, {
          status: "results",
          resultsPhaseStartedAt: serverTimestamp(),
        }).catch((error) => {
          console.error("Error transitioning to results:", error);
          timerExpiredRef.current = false; // Reset on error
        });

        if (onTimeExpired) onTimeExpired();
      }
    };

    // Update immediately
    updateTimeLeft();

    // Then update every 100ms for smooth display
    const interval = setInterval(updateTimeLeft, 100);

    return () => clearInterval(interval);
  }, [event?.status, event?.phaseStartedAt, event?.questionTimerSeconds, eventId, onTimeExpired]);

  // Reset guard when entering a NEW question phase
  useEffect(() => {
    if (event?.status === "question") {
      const currentPhaseId = `question_${event?.currentQuestionIndex}`;
      if (currentPhaseId !== phaseIdRef.current) {
        phaseIdRef.current = currentPhaseId;
        timerExpiredRef.current = false;
      }
    }
  }, [event?.status, event?.currentQuestionIndex]);

  return { timeLeft };
}
