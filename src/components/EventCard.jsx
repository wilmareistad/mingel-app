import styles from './EventCard.module.css';

export default function EventCard({ event, onManage }) {
  return (
    <button className={`adminButton ${styles.eventCard}`} onClick={() => onManage(event.id)}>
      {event.name}
    </button>
  );
}