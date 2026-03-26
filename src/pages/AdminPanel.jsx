import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { listenToAdminEvents } from "../features/event/eventService";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState(null);
  const [adminEvents, setAdminEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setAdminEvents(events);
    });

    return unsubscribe;
  }, [adminId]);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Admin Panel</h1>
      <button onClick={() => navigate("/create")}>Create Event</button>

      <hr />
      <h2>Manage Existing Games</h2>
      {adminEvents.length === 0 ? (
        <p>No events created yet</p>
      ) : (
        <ul>
          {adminEvents.map((event) => (
            <li key={event.id}>
             <button>{event.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}