import ToggleButton from "./ToggleButton";
import styles from "./TimerControl.module.css";

/**
 * Reusable timer control component for incrementing/decrementing durations
 * Used for both question timer and results timer
 */
export default function TimerControl({
  label,
  currentValue,
  options,
  onIncrement,
  onDecrement,
  onConfirm,
  formatValue,
  disabled = false,
}) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>{label}</p>
      <div className={styles.timerControl}>
        <ToggleButton
          direction="left"
          onClick={onDecrement}
          label={`Decrease ${label.toLowerCase()}`}
          disabled={disabled}
        />
        <div className={styles.timerDisplay}>
          {formatValue(currentValue)}
        </div>
        <ToggleButton
          direction="right"
          onClick={onIncrement}
          label={`Increase ${label.toLowerCase()}`}
          disabled={disabled}
        />
        <button
          className={styles.setBtn}
          onClick={onConfirm}
          disabled={disabled}
        >
          Set
        </button>
      </div>
    </div>
  );
}
