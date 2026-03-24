import { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { nanoid } from "nanoid";
import { useNavigate } from "react-router-dom";

export default function Join() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!code || !username) {
      return setMessage("Enter code and username");
    }

    try {
      const cleanCode = code.trim().toUpperCase();

      const q = query(
        collection(db, "events"),
        where("code", "==", cleanCode)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return setMessage("Event not found");
      }

      const eventDoc = snapshot.docs[0];
      const eventId = eventDoc.id;

      const userId = nanoid();

      await addDoc(collection(db, "users"), {
        userId,
        username,
        eventId,
        createdAt: serverTimestamp()
      });

      localStorage.setItem("userId", userId);
      localStorage.setItem("eventId", eventId);

      navigate(`/lobby/${eventId}`);

    } catch (error) {
      console.error(error);
      setMessage("Something went wrong");
    }
  };

  return (
    <div>
      <h1>Join Game</h1>

      <input
        type="text"
        placeholder="Event code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <input
        type="text"
        placeholder="Your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <button onClick={handleJoin}>Join</button>

      {message && <p>{message}</p>}
    </div>
  );
}