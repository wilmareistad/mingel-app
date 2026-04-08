import caretLeft from "../assets/caret-left.svg";
import caretRight from "../assets/caret-right.svg";
import styles from "../styles/ToggleButton.module.css";

export default function ToggleButton({ direction = "right", onClick, label, disabled = false, size = "default" }) {
  const iconSrc = direction === "left" ? caretRight : caretLeft;
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
