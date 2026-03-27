import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../services/firebase";
import { listenToAdminEvents } from "../features/event/eventService";
import { signOut } from "firebase/auth";
import { deleteDoc, doc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import ConfirmModal from "./ConfirmModal";
import styles from "./AdminPanel.module.css";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState(null);
  const [adminEvents, setAdminEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    confirmStyle: "default",
  });

  // Get current admin's ID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAdminId(user.uid);
      } else {
        setAdminId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Listen to admin's events
  useEffect(() => {
    if (!adminId) return;

    const unsubscribe = listenToAdminEvents(adminId, (events) => {
      // Sort by createdAt (newest first)
      const sorted = events.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setAdminEvents(sorted);
    });

    return unsubscribe;
  }, [adminId]);

  const handleGoToSettings = (eventId) => {
    navigate(`/admin/settings/${eventId}`);
  };

  const openConfirmModal = (title, message, onConfirm, confirmText = "Confirm", confirmStyle = "default") => {
    setModalState({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      confirmStyle,
    });
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false,
    });
  };

  const handleDeleteEvent = (eventId) => {
    openConfirmModal(
      "Delete Event",
      "Are you sure you want to delete this event? This will remove all participants data and cannot be undone.",
      async () => {
        closeModal();
        try {
          // Delete all participants for this event
          const participantsQuery = query(
            collection(db, "participants"),
            where("eventId", "==", eventId)
          );
          const participantsSnapshot = await getDocs(participantsQuery);
          
          if (participantsSnapshot.docs.length > 0) {
            const batch = writeBatch(db);
            participantsSnapshot.docs.forEach((d) => {
              batch.delete(d.ref);
            });
            await batch.commit();
          }

          // Delete the event
          await deleteDoc(doc(db, "events", eventId));
          setMessage("Event deleted successfully");
          setTimeout(() => setMessage(""), 3000);
        } catch (error) {
          console.error("Error deleting event:", error);
          setMessage("Error deleting event");
          setTimeout(() => setMessage(""), 3000);
        }
      },
      "Delete",
      "danger"
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      setMessage("Error logging out");
    }
  };

  const handleCreateEvent = () => {
    navigate("/create");
  };

  if (loading) return <p>Loading...</p>;

  const getStatusColor = (status) => {
    switch (status) {
      case "lobby":
        return "status-lobby";
      case "question":
        return "status-question";
      case "results":
        return "status-results";
      case "paused":
        return "status-paused";
      default:
        return "status-default";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Panel</h1>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {message && <p className={styles.message}>{message}</p>}

      <button className={styles.createBtn} onClick={handleCreateEvent}>
        + Create New Event
      </button>

      <div className={styles.eventsList}>
        {adminEvents.length === 0 ? (
          <p className={styles.noEvents}>No events yet. Create one to get started!</p>
        ) : (
          adminEvents.map((event) => (
            <div key={event.id} className={styles.eventCard}>
              <div className={styles.eventInfo}>
                <h3>{event.name}</h3>
                <p className={styles.code}>Code: <strong>{event.code}</strong></p>
                <p className={`${styles.status} ${styles[getStatusColor(event.status)]}`}>
                  Status: <strong>{event.status}</strong>
                </p>
                <p className={styles.details}>
                  Questions: {event.questions?.length || 0} | Round: {event.roundLength}m | Theme: {event.theme}
                </p>
                {event.createdAt && (
                  <p className={styles.date}>
                    Created: {new Date(event.createdAt.toMillis?.() || event.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.lobbyBtn}
                  onClick={() => handleGoToSettings(event.id)}
                >
                  Manage Event
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteEvent(event.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={closeModal}
        confirmText={modalState.confirmText}
        confirmStyle={modalState.confirmStyle}
      />
    </div>
  );
}