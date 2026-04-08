import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth } from '../services/firebase';
import { db } from '../services/firebase';
import styles from './LogOutButton.module.css';
import logoutIcon from '../assets/logout.svg';

export default function LogOutButton() {
  const navigate = useNavigate();

  const handleLogOut = async () => {
    try {
      // Delete user document from Firestore
      const userDocId = localStorage.getItem("userDocId");
      if (userDocId) {
        await deleteDoc(doc(db, "users", userDocId));
      }

      // Sign out from Firebase
      await signOut(auth);

      // Clear localStorage
      localStorage.removeItem("userId");
      localStorage.removeItem("eventId");
      localStorage.removeItem("userDocId");

      // Navigate to home page
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <button className={styles.logOutButton} onClick={handleLogOut} type="button">
      <span className={styles.text}>Log out</span>
      <img src={logoutIcon} alt="Log out" className={styles.icon} />
    </button>
  );
}
