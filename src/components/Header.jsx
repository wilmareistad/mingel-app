import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import GearIcon from '../assets/GearSix.svg';

export default function Header() {
  const navigate = useNavigate();

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate("/");
  };

  // Check if user is currently playing (has userId in sessionStorage)
  const userId = sessionStorage.getItem("userId");
  const isPlaying = !!userId;

  return (
    <header className={styles.header}>
      <nav>
      {isPlaying ? (
        // If playing, render as non-clickable text
        <span className={styles.logo}>
          Pulse
        </span>
      ) : (
        // If not playing, render as clickable link
        <a href="/" onClick={handleLogoClick} className={styles.logo}>
          Pulse
        </a>
      )}
      </nav>
    </header>
  );
}