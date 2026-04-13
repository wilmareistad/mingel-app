import { useNavigate } from "react-router-dom";
import styles from "./EventGone.module.css";

export default function EventGone() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.code}>410</h1>
        <h2 className={styles.title}>Event Deleted</h2>
        <p className={styles.message}>
          The admin has deleted this event. It is no longer available.
        </p>
        <div className={styles.actions}>
          <button 
            className={styles.primaryBtn} 
            onClick={() => navigate("/")}
          >
            Go Home
          </button>
          <button 
            className={styles.secondaryBtn} 
            onClick={() => navigate("/join")}
          >
            Join Another Event
          </button>
        </div>
      </div>
    </div>
  );
}
