import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, setDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { nanoid } from "nanoid";
import { createCustomQuestion, getCustomQuestionsForEvent } from "../features/customQuestion/customQuestionService";
import AddCustomQuestion from "../components/AddCustomQuestion";
import styles from "./CreateEvent.module.css"


const themes = [
  { value: "yrgo", label: "YRGO Mode" },
  { value: "wedding", label: "Wedding Mode" },
];

const timerOptions = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 450, 540, 630, 720, 810, 900];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [eventName, setEventName] = useState("");
  const [message, setMessage] = useState("");
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [eventCategories, setEventCategories] = useState([]); // Event-specific categories
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [selectedCustomQuestions, setSelectedCustomQuestions] = useState([]);
  const [theme, setTheme] = useState("");
  const [questionCategory, setQuestionCategory] = useState("");
  const [questionTimerSeconds, setQuestionTimerSeconds] = useState(300); // default 5 min
  const [resultTimerSeconds, setResultTimerSeconds] = useState(60); // default 1 min

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAdminId(user ? user.uid : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function fetchQuestionsAndCategories() {
      const snapshot = await getDocs(collection(db, "questions"));
      const qList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setQuestions(qList);

      // unique categories from the questions
      const unique = [...new Set(qList.map((q) => q.category).filter(Boolean))];
      setCategories(unique);
    }
    fetchQuestionsAndCategories();
  }, []);

  const handleQuestionToggle = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  const handleCustomQuestionToggle = (id) => {
    setSelectedCustomQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  const handleAddCustomQuestion = async (questionData) => {
    try {
      // Don't create in Firestore yet - just store locally
      // We'll create them in batch when the event is created
      const tempId = nanoid(12);
      
      // Add category to event-specific categories if it's new
      if (questionData.category && !eventCategories.includes(questionData.category)) {
        setEventCategories((prev) => [...prev, questionData.category]);
      }
      
      // Add to local state
      setCustomQuestions((prev) => [
        ...prev,
        {
          id: tempId,
          ...questionData,
          isTemp: true, // Mark as temporary (not yet in Firestore)
        },
      ]);

      // Add to selected questions
      setSelectedCustomQuestions((prev) => [...prev, tempId]);
    } catch (error) {
      console.error("Error adding custom question:", error);
    }
  };


  const handleCreate = async () => {
    if (!eventName) return setMessage("Enter event name");
    if (!adminId) return setMessage("You must be logged in");
    if (!theme) return setMessage("Select a theme");
    
    const totalQuestions = selectedQuestions.length + selectedCustomQuestions.length;
    if (totalQuestions === 0) return setMessage("Select at least one question");

    const code = nanoid(4).toUpperCase();
    const docId = `${eventName.replace(/\s+/g, "")}_${code}`;

    try {
      // First, create all custom questions with the real event ID
      const customQuestionIds = [];
      for (const customQId of selectedCustomQuestions) {
        const customQ = customQuestions.find(q => q.id === customQId);
        if (customQ && customQ.isTemp) {
          // This is a temporary local question, create it in Firestore
          const createdId = await createCustomQuestion(
            docId,
            customQ.text,
            customQ.category,
            customQ.options,
            adminId
          );
          customQuestionIds.push(createdId);
        } else {
          // This is already in Firestore from a previous creation, keep the ID
          customQuestionIds.push(customQId);
        }
      }

      // Create event with both question types
      await setDoc(doc(db, "events", docId), {
        name: eventName,
        code,
        status: "lobby",
        questions: selectedQuestions,
        customQuestions: customQuestionIds,
        currentQuestionIndex: 0,
        createdAt: serverTimestamp(),
        createdBy: adminId,
        adminId,
        theme,
        questionTimerSeconds,
        resultTimerSeconds,
      });
      navigate(`/admin/settings/${docId}`);
    } catch (error) {
      console.error("Error creating event:", error);
      setMessage("Error creating event");
    }
  };

  if (loading) return <p>Loading...</p>;

  const filteredQuestions = questionCategory
    ? questions.filter((q) => q.category === questionCategory)
    : questions;

  return (
    <div>
      <h1>Create Event</h1>

      <div>
        <label>Name:</label>
        <input
          type="text"
          placeholder="Event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </div>

      <div>
        <label>Time for question:</label>
        <select value={questionTimerSeconds} onChange={e => setQuestionTimerSeconds(Number(e.target.value))}>
          {timerOptions.map((sec) => (
            <option key={sec} value={sec}>{sec/60 >= 1 ? `${Math.floor(sec/60)} min${sec%60 ? ' ' + (sec%60) + 's' : ''}` : `${sec}s`}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Time for result:</label>
        <select value={resultTimerSeconds} onChange={e => setResultTimerSeconds(Number(e.target.value))}>
          {timerOptions.map((sec) => (
            <option key={sec} value={sec}>{sec/60 >= 1 ? `${Math.floor(sec/60)} min${sec%60 ? ' ' + (sec%60) + 's' : ''}` : `${sec}s`}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Theme:</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">Select a theme</option>
          {themes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Questions ({selectedQuestions.length} selected):</label>

        <div>
          <select
            value={questionCategory}
            onChange={(e) => setQuestionCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {questionCategory && (
            <button className="adminButton" onClick={() => setQuestionCategory("")}>Clear filter</button>
          )}
        </div>

        <div style={{ height: "200px", overflowY: "scroll", border: "1px solid #ccc" }}>
          {filteredQuestions.length === 0 && <p>No questions found.</p>}
          {filteredQuestions.map((q) => (
            <div key={q.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedQuestions.includes(q.id)}
                  onChange={() => handleQuestionToggle(q.id)}
                />
                {q.text}
              </label>
            </div>
          ))}
        </div>
      </div>

      <AddCustomQuestion 
        eventId="new"
        adminId={adminId}
        onQuestionAdded={handleAddCustomQuestion}
        categories={categories}
        eventCategories={eventCategories}
      />

      {selectedCustomQuestions.length > 0 && (
        <div>
          <label>Custom Questions ({selectedCustomQuestions.length} selected):</label>
          <div style={{ height: "150px", overflowY: "scroll", border: "1px solid #ccc", padding: "8px" }}>
            {customQuestions.map((q) => (
              <div key={q.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedCustomQuestions.includes(q.id)}
                    onChange={() => handleCustomQuestionToggle(q.id)}
                  />
                  {q.text} <em>({q.category})</em>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="adminButton" onClick={handleCreate}>Create Event</button>
      {message && <p>{message}</p>}
    </div>
  );
}