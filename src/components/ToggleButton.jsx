import caretLeft from "../assets/caret-left.svg";
import caretRight from "../assets/caret-right.svg";
import caretLeftMatrix from "../assets/caret-left-matrix.svg";
import caretRightMatrix from "../assets/caret-right-matrix.svg";
import styles from "../styles/ToggleButton.module.css";

export default function ToggleButton({ direction = "right", onClick, label, disabled = false, size = "default", matrixMode = false }) {
  // Use lime green arrows in Matrix Mode, regular arrows otherwise
  const caretLeftSrc = matrixMode ? caretLeftMatrix : caretLeft;
  const caretRightSrc = matrixMode ? caretRightMatrix : caretRight;
  
  const iconSrc = direction === "left" ? caretRightSrc : caretLeftSrc;
  const altText = direction === "left" ? "Previous" : "Next";
  const className = size === "small" ? `${styles.toggleButton} ${styles.small}` : styles.toggleButton;

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label || altText}
      type="button"
    >
      <img src={iconSrc} alt={altText} />
    </button>
  );
}
