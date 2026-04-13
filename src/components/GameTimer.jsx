import { useState, useEffect, useRef } from "react";
import styles from "./GameTimer.module.css";

export default function Timer({ 
  eventId, 
  event, 
  onTimeExpired,
  isActive = true 
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const hasExpiredRef = useRef(false);
  const currentPhaseRef = useRef(null);

  // Single unified effect for timer management
  useEffect(() => {
    if (!event || !isActive || event.status !== "question") {
      setTimeLeft(0);
      hasExpiredRef.current = false;
      return;
    }

    // Identify this phase (to reset expiration flag if we enter a new question)
    const phaseId = `question_${event.currentQuestionIndex}`;
    if (phaseId !== currentPhaseRef.current) {
      currentPhaseRef.current = phaseId;
      hasExpiredRef.current = false;
    }

    // Get question timer duration (default 5 minutes = 300 seconds)
    const durationSeconds = event.questionTimerSeconds || 300;

    // Calculate time elapsed since phase started
    const phaseStartedAt = event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;
    if (!phaseStartedAt) {
      setTimeLeft(durationSeconds);
      return;
    }

    // Function to update timer display and check for expiration
    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - phaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      setTimeLeft(remaining);

      // Fire callback exactly once when timer hits 0 (only for this phase)
      if (remaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        console.log("⏰ GAME TIMER EXPIRED - calling onTimeExpired callback");
        if (onTimeExpired) {
          onTimeExpired();
        }
      }
    };

    // Update immediately for smooth UX
    updateTimer();

    // Then update every 100ms for real-time countdown display
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [event?.status, event?.currentQuestionIndex, event?.phaseStartedAt, event?.questionTimerSeconds, isActive, onTimeExpired]);

  // Determine display format: "Xmin" for >60s, "Xs" for ≤60s
  const displayText = timeLeft > 60 
    ? `${Math.floor(timeLeft / 60)}min`
    : `${timeLeft}s`;

  const isCritical = timeLeft <= 5 && timeLeft > 0;

  // Calculate progress percentage for conic gradient
  const durationSeconds = event?.questionTimerSeconds || 300;
  const progress = Math.round(((durationSeconds - timeLeft) / durationSeconds) * 100);
  
  // Calculate hue shift: green (120°) when full → red (0°) when empty
  const hue = Math.round((timeLeft / durationSeconds) * 120);

  return (
    <div 
      className={`${styles.timer} ${isCritical ? styles.critical : ""}`}
      style={{ "--hue": hue }}
    >
      <div 
        className={styles.display}
        style={{ "--progress": progress }}
      >
        {displayText}
      </div>
    </div>
  );
}
