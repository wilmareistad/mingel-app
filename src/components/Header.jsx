import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import styles from './Header.module.css';
import LogOutButton from './LogOutButton';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Check if on a game-related URL: lobby/eventId, game/eventId, results/eventId
  const isOnGameURL = /^\/(lobby|game|results)\//.test(location.pathname);

  // Check if on admin lobby or results page where logout should be hidden
  const isOnAdminOrResults = /^\/(admin\/lobby|results)\//.test(location.pathname);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {isOnGameURL ? (
          // If on game URL, render as non-clickable text
          <span className={styles.logo}>
            Pulse
          </span>
        ) : (
          // Otherwise, render as clickable link
          <a href="/" onClick={handleLogoClick} className={styles.logo}>
            Pulse
          </a>
        )}
        {isAdmin && !isOnAdminOrResults && (
          <div className={styles.adminControls}>
            <LogOutButton />
          </div>
        )}
      </nav>
    </header>
  );
}