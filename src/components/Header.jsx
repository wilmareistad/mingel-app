import { Link, useNavigate } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import styles from './Header.module.css';
import GearIcon from '../assets/GearSix.svg';

export default function Header() {
  const navigate = useNavigate();

  const handleLogoClick = async (e) => {
    e.preventDefault();

    const userDocId = localStorage.getItem("userDocId");
    if (userDocId) {
      await deleteDoc(doc(db, "users", userDocId));
      localStorage.removeItem("userId");
      localStorage.removeItem("eventId");
      localStorage.removeItem("userDocId");
    }

    navigate("/");
  };

  return (
    <header className={styles.header}>
      <nav>
      <a href="/" onClick={handleLogoClick} className={styles.logo}>
        Pulse
      </a>
      <img src={GearIcon} alt="Settings" className={styles.icon} />
      </nav>
    </header>
  );
}