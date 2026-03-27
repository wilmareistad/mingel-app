import styles from "./KickedModal.module.css";

/**
 * Modal shown when a player is kicked from the game
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback when user clicks OK (should navigate home)
 */
export default function KickedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2 className={styles.title}>You've Been Kicked</h2>
        <p className={styles.message}>
          You have been removed from this game by the admin. 
          <br />
          <br />
          Return to the home page to join another game.
        </p>
        <div className={styles.actions}>
          <button className={styles.okButton} onClick={onClose}>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
