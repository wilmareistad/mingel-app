import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { listenToParticipants } from "../features/event/eventService";
import { useTheme } from "../hooks/useTheme";
import UsersLobby from "./UsersLobby";
import EventQRCodeDisplay from "../components/QRCodeDisplay";
import styles from "./Lobby.module.css";

export default function AdminLobby() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);

  // Fetch event data
  useEffect(() => {
    const eventRef = doc(db, "events", eventId);
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        setEvent(docSnap.data());
      }
    });
    return unsubscribe;
  }, [eventId]);

  // Redirect to results page when event is in results status, go back to admin lobby when it's not
  useEffect(() => {
    if (!event) return;
    
    if (event.status === "results") {
      navigate(`/results/${eventId}?admin=true`, { replace: true });
    }
  }, [event?.status, eventId, navigate]);

  // Apply theme based on event
  useTheme(event?.theme);

  // Fetch participants
  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = listenToParticipants(eventId, setPlayers);
    return unsubscribe;
  }, [eventId]);

  if (!event) return <p>Loading...</p>;

  return (
    <div>
      <h1>{event.name}</h1>
      <p style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
        Event Code: <strong>{event.code}</strong>
      </p>
      <EventQRCodeDisplay eventCode={event.code} />
      <UsersLobby users={players.map(p => ({ userId: p.id, name: p.name, avatar: p.avatar }))} />
    </div>
  );
}
