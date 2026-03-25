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
import { hasUserAnswered } from "../features/game/gameService";

export default function Lobby() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);

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

    const unsubscribeEvent = onSnapshot(eventRef, async (docSnap) => {
      if (docSnap.exists()) {
        const eventData = docSnap.data();
        setEvent(eventData);

        // GAME LOOP: If event status changes to "question" AND user hasn't answered yet
        // redirect to game
        if (eventData.status === "question") {
          const userId = localStorage.getItem("userId");
          const currentQuestionId = eventData.questions?.[eventData.currentQuestionIndex];
          
          // Only redirect if user hasn't answered this question yet
          if (userId && currentQuestionId) {
            const alreadyAnswered = await hasUserAnswered(userId, currentQuestionId);
            if (!alreadyAnswered) {
              navigate(`/game/${eventId}`);
            }
          }
        }
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
  }, [eventId, navigate]);

  // ⏳ loading state
  if (!event) return <p>Loading room...</p>;

  return (
    <div>
      <h1>Lobby</h1>

      <p><strong>Room Name:</strong> {event.name}</p>
      <p><strong>Room Code:</strong> {event.code}</p>
      <p><strong>Status:</strong> {event.status}</p>

      <h2>Players ({players.length})</h2>

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
