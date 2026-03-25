import { useState } from "react";
import { collection, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { nanoid } from "nanoid";

export default function CreateEvent() {
  const [eventName, setEventName] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    if (!eventName) return setMessage("Enter event name");

    // Generate a 4-character code using nanoid
    const code = nanoid(4).toUpperCase();

    // Create document ID as "EventName_CODE" (e.g., "Hamburgerevent_SR9E")
    const docId = `${eventName.replace(/\s+/g, '')}_${code}`;

    try {
      await setDoc(doc(db, "events", docId), {
        name: eventName,
        code,
        status: "lobby",
        questions: [],
        currentQuestionIndex: 0,
        createdAt: serverTimestamp()
      });

      setMessage(`Event created! Code: ${code}`);
      setEventName("");
    } catch (error) {
      console.error("Error creating event:", error);
      setMessage("Error creating event");
    }
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
