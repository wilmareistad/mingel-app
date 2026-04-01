import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, setDoc, doc,  serverTimestamp, getDocs } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { nanoid } from "nanoid";
import { createCustomQuestion } from "../features/customQuestion/customQuestionService";
import AddCustomQuestion from "../components/AddCustomQuestion";
import styles from "./CreateEvent.module.css";

const themes = [
  { value: "yrgo", label: "YRGO Mode" },
  { value: "wedding", label: "Wedding Mode" },
];

const timerOptions = [
  30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 450, 540, 630, 720,
  810, 900,
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [eventName, setEventName] = useState("");
  const [message, setMessage] = useState("");
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [selectedCustomQuestions, setSelectedCustomQuestions] = useState([]);
  const [theme, setTheme] = useState("");
  const [questionCategory, setQuestionCategory] = useState("");
  const [questionTimerSeconds, setQuestionTimerSeconds] = useState(300);
  const [resultTimerSeconds, setResultTimerSeconds] = useState(60);

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
      const unique = [...new Set(qList.map((q) => q.category).filter(Boolean))];
      setCategories(unique);
    }
    fetchQuestionsAndCategories();
  }, []);

  const handleQuestionToggle = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id],
    );
  };

  const handleCustomQuestionToggle = (id) => {
    setSelectedCustomQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id],
    );
  };

  const handleAddCustomQuestion = async (questionData) => {
    try {
      const tempId = nanoid(12);
      if (
        questionData.category &&
        !eventCategories.includes(questionData.category)
      ) {
        setEventCategories((prev) => [...prev, questionData.category]);
      }
      setCustomQuestions((prev) => [
        ...prev,
        { id: tempId, ...questionData, isTemp: true },
      ]);
      setSelectedCustomQuestions((prev) => [...prev, tempId]);
    } catch (error) {
      console.error("Error adding custom question:", error);
    }
  };

  const handleCreate = async () => {
    if (!eventName) return setMessage("Enter event name");
    if (!adminId) return setMessage("You must be logged in");
    if (!theme) return setMessage("Select a theme");
    const totalQuestions =
      selectedQuestions.length + selectedCustomQuestions.length;
    if (totalQuestions === 0) return setMessage("Select at least one question");

    const code = nanoid(4).toUpperCase();
    const docId = `${eventName.replace(/\s+/g, "")}_${code}`;

    try {
      const customQuestionIds = [];
      for (const customQId of selectedCustomQuestions) {
        const customQ = customQuestions.find((q) => q.id === customQId);
        if (customQ && customQ.isTemp) {
          const createdId = await createCustomQuestion(
            docId,
            customQ.text,
            customQ.category,
            customQ.options,
            adminId,
          );
          customQuestionIds.push(createdId);
        } else {
          customQuestionIds.push(customQId);
        }
      }

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
      <h1>Set up new event</h1>

      <div className={styles.inputContainer}>
        <label>Name:</label>
        <input
          type="text"
          placeholder="Event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </div>

      <div className={styles.inputContainer}>
        <label>Time for question:</label>
        <select
          value={questionTimerSeconds}
          onChange={(e) => setQuestionTimerSeconds(Number(e.target.value))}
        >
          {timerOptions.map((sec) => (
            <option key={sec} value={sec}>
              {sec / 60 >= 1
                ? `${Math.floor(sec / 60)} min${sec % 60 ? " " + (sec % 60) + "s" : ""}`
                : `${sec}s`}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.inputContainer}>
        <label>Time for result:</label>
        <select
          value={resultTimerSeconds}
          onChange={(e) => setResultTimerSeconds(Number(e.target.value))}
        >
          {timerOptions.map((sec) => (
            <option key={sec} value={sec}>
              {sec / 60 >= 1
                ? `${Math.floor(sec / 60)} min${sec % 60 ? " " + (sec % 60) + "s" : ""}`
                : `${sec}s`}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.inputContainer}>
        <label>Theme:</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">Select a theme</option>
          {themes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.inputContainer}>
        <label>Questions:</label>
        <div className={styles.filterRow}>
          <select
            value={questionCategory}
            onChange={(e) => setQuestionCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            className={styles.clearFilter}
            onClick={() => setQuestionCategory("")}
          >
            Clear filter
          </button>
        </div>

        <div className={styles.questionList}>
          {filteredQuestions.length === 0 && <p>No questions found.</p>}
          {filteredQuestions.map((q) => (
            <label key={q.id} className={styles.questionItem}>
              <input
                type="checkbox"
                checked={selectedQuestions.includes(q.id)}
                onChange={() => handleQuestionToggle(q.id)}
              />
              <span>{q.text}</span>
            </label>
          ))}
        </div>
        <p className={styles.questionCount}>
          {selectedQuestions.length} selected
        </p>
      </div>

      <AddCustomQuestion
        eventId="new"
        adminId={adminId}
        onQuestionAdded={handleAddCustomQuestion}
        categories={categories}
        eventCategories={eventCategories}
      />

      {selectedCustomQuestions.length > 0 && (
        <div className={styles.inputContainer}>
          <label>Custom Questions:</label>
          <div className={styles.questionList}>
            {customQuestions.map((q) => (
              <div key={q.id} className={styles.questionItem}>
                <input
                  type="checkbox"
                  checked={selectedCustomQuestions.includes(q.id)}
                  onChange={() => handleCustomQuestionToggle(q.id)}
                />
                <span>
                  {q.text} <em>({q.category})</em>
                </span>
              </div>
            ))}
          </div>
          <p className={styles.questionCount}>
            {selectedCustomQuestions.length} selected
          </p>
        </div>
      )}

      <button className="adminButton" onClick={handleCreate}>
        Create Event
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
