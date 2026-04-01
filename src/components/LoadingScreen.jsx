import styles from "../styles/LoadingScreen.module.css";
import yrgoLogo from "../assets/bomarke.svg";

export default function LoadingScreen() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingContent}>
        <h1 className={styles.pulse}>Pulse</h1>
        <p className={styles.by}>by</p>
        <img src={yrgoLogo} alt="YRGO" className={styles.yrgoLogo} />
      </div>
    </div>
  );
}
