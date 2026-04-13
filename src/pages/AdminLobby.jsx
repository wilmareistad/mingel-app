import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { listenToParticipants } from "../features/event/eventService";
import { getCurrentEventQuestion } from "../features/question/questionService";
import { useTheme } from "../hooks/useTheme";
import UsersLobby from "./UsersLobby";
import EventQRCodeDisplay from "../components/QRCodeDisplay";
import styles from "./Lobby.module.css";

export default function AdminLobby() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);

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

  // Load current question when event status or questionIndex changes
  useEffect(() => {
    if (!event || event.status !== "question") {
      setCurrentQuestion(null);
      return;
    }

    async function loadQuestion() {
      const q = await getCurrentEventQuestion(eventId, event.currentQuestionIndex);
      setCurrentQuestion(q);
    }

    loadQuestion();
  }, [event?.status, event?.currentQuestionIndex, eventId]);

  if (!event) return <p>Loading...</p>;

  return (
    <div>
      <h1>{event.name}</h1>
      <p style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
        Event Code: <strong>{event.code}</strong>
      </p>
      {event.status === "question" && currentQuestion && (
        <div style={{ 
          marginBottom: "20px", 
          padding: "15px", 
          backgroundColor: "transparent", 
          borderRadius: "8px",
          border: "2px solid #333"
        }}>
          <h2 style={{ marginTop: 0, marginBottom: "10px" }}>
            Current Question: <strong>{currentQuestion.text}</strong>
          </h2>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "0" }}>
            Question {currentQuestion.currentIndex + 1} of {currentQuestion.totalQuestions}
          </p>
        </div>
      )}
      <EventQRCodeDisplay eventCode={event.code} />
      <UsersLobby users={players.map(p => ({ userId: p.id, name: p.name, avatar: p.avatar }))} />
    </div>
  );
}
