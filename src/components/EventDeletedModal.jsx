import styles from "./EventDeletedModal.module.css";

export default function EventDeletedModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Event Deleted</h2>
        <p>The admin has deleted this event. You will be redirected shortly.</p>
        <button className={styles.btn} onClick={onClose}>
          Go Home
        </button>
      </div>
    </div>
  );
}
