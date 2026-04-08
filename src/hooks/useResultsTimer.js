import { useState, useEffect, useRef } from "react";

/**
 * Hook for results phase countdown timer
 * Auto-advances to next question when timer expires
 * Uses useRef guard to prevent duplicate auto-advances
 * Only reads from event listener data (no DB reads inside interval)
 */
export function useResultsTimer(event, eventId, onTimeExpired) {
  const [timeLeft, setTimeLeft] = useState(0);
  const timerExpiredRef = useRef(false);
  const phaseIdRef = useRef(null);

  // Auto-advance when results timer expires
  useEffect(() => {
    if (!event || event.status !== "results" || !event.showingResultsOnly) {
      setTimeLeft(0);
      timerExpiredRef.current = false;
      return;
    }

    // Capture the phase start time and duration at the START of the effect
    // This prevents issues if event data changes during the interval
    const capturedPhaseStartedAt =
      event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;
    const capturedDurationSeconds = event.resultsTimerSeconds || 10;

    if (!capturedPhaseStartedAt) {
      setTimeLeft(capturedDurationSeconds);
      return;
    }

    const updateTimeLeft = () => {
      const now = Date.now();
      const elapsedMs = now - capturedPhaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, capturedDurationSeconds - elapsedSeconds);

      setTimeLeft(remaining);

      // ✅ SAFE: Auto-advance when timer expires
      // Uses useRef guard to prevent duplicate fires
      // Uses event data from listener (no DB read inside loop)
      // Additional safety: Only advance if duration is positive
      if (remaining === 0 && !timerExpiredRef.current && capturedDurationSeconds > 0) {
        timerExpiredRef.current = true;

        if (onTimeExpired) onTimeExpired();
      }
    };

    // Update immediately
    updateTimeLeft();

    // Then update every 100ms for smooth display
    const interval = setInterval(updateTimeLeft, 100);

    return () => clearInterval(interval);
  }, [event?.status, event?.showingResultsOnly, event?.resultsPhaseStartedAt, event?.resultsTimerSeconds, eventId, onTimeExpired]);

  // Reset guard when entering a NEW results phase
  useEffect(() => {
    if (event?.status === "results" && event?.showingResultsOnly) {
      const currentPhaseId = `results_${event?.currentQuestionIndex}`;
      if (currentPhaseId !== phaseIdRef.current) {
        phaseIdRef.current = currentPhaseId;
        timerExpiredRef.current = false;
      }
    }
  }, [event?.status, event?.showingResultsOnly, event?.currentQuestionIndex]);

  return { timeLeft };
}
