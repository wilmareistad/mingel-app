import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { listenToAdminEvents } from "../features/event/eventService";
import EventCard from "../components/EventCard";
import styles from "./AdminPanel.module.css";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminEvents, setAdminEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAdminId(user.uid);
        setAdminEmail(user.email?.split("@")[0] || "");
      } else {
        setAdminId(null);
        setAdminEmail("");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!adminId) return;
    const unsubscribe = listenToAdminEvents(adminId, (events) => {
      const sorted = events.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setAdminEvents(sorted);
    });
    return unsubscribe;
  }, [adminId]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome, {adminEmail}!</h1>
      </div>

      <button className={styles.createBtn} onClick={() => navigate("/create")}>
        + Create New Event
      </button>

      <div className={styles.eventsList}>
        {adminEvents.length === 0 ? (
          <p className={styles.noEvents}>No events yet. Create one to get started!</p>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>Manage existing events</h2>
            {adminEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onManage={(id) => navigate(`/admin/settings/${id}`)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}