import { useNavigate } from "react-router-dom";
import styles from "./NotFound.module.css";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Room Not Found</h2>
        <p className={styles.message}>
          The room you're looking for doesn't exist or has been deleted.
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
            Join Another Room
          </button>
        </div>
      </div>
    </div>
  );
}
