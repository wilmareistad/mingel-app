import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { nanoid } from "nanoid";

export default function CreateEvent() {
  const [eventName, setEventName] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    if (!eventName) return setMessage("Enter event name:");

    const code = nanoid(4);

    await addDoc(collection(db, "events"), {
      name: eventName,
      code,
      status: "lobby",
      questions: [],
      createdAt: serverTimestamp()
    });

    setMessage(`Event created! Code: ${code}`);
    setEventName("");
  };

  return (
    <div>
      <h1>Create Event</h1>
      <input
        type="text"
        placeholder="Event name"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
      />
      <button onClick={handleCreate}>Create Event</button>

      {message && <p>{message}</p>}
    </div>
  );
}