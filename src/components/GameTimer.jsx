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

  // Main effect: Calculate time whenever event changes
  useEffect(() => {
    if (!event || !isActive || event.status !== "question") {
      setTimeLeft(0);
      hasExpiredRef.current = false;
      return;
    }

    // Reset expiration flag when a new question starts
    hasExpiredRef.current = false;

    // Get question timer duration (default 5 minutes = 300 seconds)
    const durationSeconds = event.questionTimerSeconds || 300;

    // Calculate time elapsed since phase started
    const phaseStartedAt = event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;
    if (!phaseStartedAt) {
      setTimeLeft(durationSeconds);
      return;
    }

    const now = Date.now();
    const elapsedMs = now - phaseStartedAt;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(0, durationSeconds - elapsedSeconds);

    setTimeLeft(remaining);

    // If time expired and we haven't called callback yet, call it once
    if (remaining === 0 && onTimeExpired && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onTimeExpired();
    }
  }, [event, isActive, onTimeExpired]);

  // Update timer every 100ms for smooth real-time updates
  useEffect(() => {
    if (!isActive || !event || event.status !== "question") return;

    const durationSeconds = event.questionTimerSeconds || 300;
    const phaseStartedAt = event.phaseStartedAt?.toMillis?.() || event.phaseStartedAt;
    
    if (!phaseStartedAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - phaseStartedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      setTimeLeft(remaining);

      // Only call callback once when timer reaches exactly 0
      if (remaining === 0 && onTimeExpired && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onTimeExpired();
      }
    }, 100); // Update every 100ms for smooth real-time display

    return () => clearInterval(interval);
  }, [event, isActive, onTimeExpired]);

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
