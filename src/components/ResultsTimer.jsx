import { useState, useEffect, useRef } from "react";
import styles from "./ResultsTimer.module.css";

export default function ResultsTimer({ 
  eventId, 
  event,
  onTimeExpired
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const hasExpiredRef = useRef(false);

  // Main effect: Calculate time whenever event changes
  useEffect(() => {
    if (!event || event.status !== "results" || !event.showingResultsOnly) {
      setTimeLeft(0);
      hasExpiredRef.current = false;
      return;
    }

    // Reset expiration flag when results start
    hasExpiredRef.current = false;

    // Get results timer duration (default 10 seconds)
    const durationSeconds = event.resultsTimerSeconds || 10;

    // Calculate time elapsed since phase started
    const phaseStartedAt = event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;
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
  }, [event, onTimeExpired]);

  // Update timer every 100ms for smooth real-time updates
  useEffect(() => {
    if (!event || event.status !== "results" || !event.showingResultsOnly) return;

    const durationSeconds = event.resultsTimerSeconds || 10;
    const phaseStartedAt = event.resultsPhaseStartedAt?.toMillis?.() || event.resultsPhaseStartedAt;
    
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
  }, [event, onTimeExpired]);

  const isCritical = timeLeft <= 5 && timeLeft > 0;

  // Calculate progress percentage for conic gradient
  const durationSeconds = event?.resultsTimerSeconds || 10;
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
        {timeLeft}s
      </div>
    </div>
  );
}
