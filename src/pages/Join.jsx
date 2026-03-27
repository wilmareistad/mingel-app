import { useState, useEffect } from "react";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { nanoid } from "nanoid";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addParticipant } from "../features/event/eventService";
import ToggleButton from "../components/ToggleButton";
import styles from "../styles/Join.module.css";

export default function Join() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  // On mount, check if code is in URL params
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!code || !username) {
      return setMessage("Enter code and username");
    }

    try {
      const cleanCode = code.trim().toUpperCase();

      const q = query(collection(db, "events"), where("code", "==", cleanCode));

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return setMessage("Event not found");
      }

      const eventDoc = snapshot.docs[0];
      const eventId = eventDoc.id;

      const userId = nanoid();

      // Set document with userId as the document ID in users collection (for legacy compatibility)
      await setDoc(doc(db, "users", userId), {
        username,
        eventId,
        createdAt: serverTimestamp(),
      });

      // Also add as participant in event sub-collection (new structure)
      await addParticipant(eventId, userId, username);

      localStorage.setItem("userDocId", userId);
      localStorage.setItem("userId", userId);
      localStorage.setItem("eventId", eventId);
      localStorage.setItem("username", username);

      navigate(`/lobby/${eventId}`);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong");
    }
  };

  return (
    <div>
      <h1>Join Game</h1>

      <div className={styles.avatarCreator}>
        <div className={styles.avatarView}></div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Base" />
          <p>Base</p>
          <ToggleButton direction="right" label="Next Base" />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Hair" />
          <p>Hair</p>
          <ToggleButton direction="right" label="Next Hair" />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Eyes" />
          <p>Eyes</p>
          <ToggleButton direction="right" label="Next Eyes" />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Nose" />
          <p>Nose</p>
          <ToggleButton direction="right" label="Next Nose" />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Mouth" />
          <p>Mouth</p>
          <ToggleButton direction="right" label="Next Mouth" />
        </div>
      </div>

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
