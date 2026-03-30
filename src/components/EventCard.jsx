import styles from './EventCard.module.css';

export default function EventCard({ event, onManage }) {
  return (
    <button className={styles.eventCard} onClick={() => onManage(event.id)}>
      {event.name}
    </button>
  );
}