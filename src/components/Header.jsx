import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import styles from './Header.module.css';
import LogOutButton from './LogOutButton';

export default function Header() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate("/");
  };

  // Check if user is authenticated as admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return unsubscribe;
  }, []);

  // Check if user is currently playing (has userId in sessionStorage)
  const userId = sessionStorage.getItem("userId");
  const isPlaying = !!userId;

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
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
        {isAdmin && (
          <div className={styles.adminControls}>
            <LogOutButton />
          </div>
        )}
      </nav>
    </header>
  );
}