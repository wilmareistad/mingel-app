import styles from './EventCard.module.css';

export default function EventCard({ event, onManage, onDelete }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.toDate ? timestamp.toDate() : timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className={styles.eventCard}>
      <div className={styles.eventInfo}>
        <h3>{event.name}</h3>
        <div className={styles.code}>
          Code: <strong>{event.code}</strong>
        </div>
        <div className={styles.status}>
          Status: <strong>{event.status || 'pending'}</strong>
        </div>
        <div className={styles.details}>
          Questions: {event.questions?.length || 0}
        </div>
        <div className={styles.date}>
          Created: {formatDate(event.createdAt)}
        </div>
      </div>
      <div className={styles.actions}>
        <button 
          className={styles.lobbyBtn}
          onClick={() => onManage(event.id)}
        >
          Manage Event
        </button>
        <button 
          className={styles.deleteBtn}
          onClick={() => onDelete(event.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
