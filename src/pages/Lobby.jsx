import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

export default function Lobby() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);

  const navigate = useNavigate();

  const handleLeave = async () => {
    const userDocId = localStorage.getItem("userDocId");
    if (userDocId) {
      await deleteDoc(doc(db, "users", userDocId));
      localStorage.removeItem("userId");
      localStorage.removeItem("eventId");
      localStorage.removeItem("userDocId");
    }
    navigate("/");
  };

  useEffect(() => {
    // fetch room data
    const eventRef = doc(db, "events", eventId);

    const unsubscribeEvent = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        setEvent(docSnap.data());
      } else {
        setEvent(null);
      }
    });

    // fetch users in this room
    const usersRef = collection(db, "users");

    const q = query(usersRef, where("eventId", "==", eventId));

    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPlayers(userList);
    });

    return () => {
      unsubscribeEvent();
      unsubscribeUsers();
    };
  }, [eventId]);

  // ⏳ loading state
  if (!event) return <p>Loading room...</p>;

  return (
    <div>
      <h1>Lobby</h1>

      <p>
        <strong>Room Name:</strong> {event.name}
      </p>
      <p>
        <strong>Room Code:</strong> {event.code}
      </p>

      <h2>Players</h2>

      {players.length > 0 ? (
        <ul>
          {players.map((player) => (
            <li key={player.id}>{player.username}</li>
          ))}
        </ul>
      ) : (
        <p>No players yet...</p>
      )}
      <button onClick={handleLeave}>Leave Game</button>
    </div>
  );
}
