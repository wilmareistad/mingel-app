import { Link, useNavigate } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import styles from './Header.module.css';
import GearIcon from '../assets/GearSix.svg';

export default function Header() {
  const navigate = useNavigate();

  const handleLogoClick = async (e) => {
    e.preventDefault();

    // If user is in a game (has eventId), do nothing
    const eventId = localStorage.getItem("eventId");
    if (eventId) {
      return;
    }

    // If not in a game, log out and go home
    const userDocId = localStorage.getItem("userDocId");
    if (userDocId) {
      try {
        await deleteDoc(doc(db, "users", userDocId));
      } catch (error) {
        console.warn("Could not delete user doc:", error);
      }
    }

    // Delete from participants sub-collection
    if (userId && eventId) {
      try {
        await deleteDoc(doc(db, "events", eventId, "participants", userId));
      } catch (error) {
        console.warn("Could not delete participant:", error);
      }
    }

    // Don't clear sessionStorage here - let the Lobby detect the user is missing from Firestore
    // When they navigate back via browser history, they'll see the kicked modal
    // sessionStorage will be cleared on tab close via beforeunload in useAutoLeaveGame

    navigate("/");
  };

  return (
    <header className={styles.header}>
      <nav>
      <a href="/" onClick={handleLogoClick} className={styles.logo}>
        Pulse
      </a>
      </nav>
    </header>
  );
}