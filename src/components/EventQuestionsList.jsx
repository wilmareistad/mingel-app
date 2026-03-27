import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function EventQuestionsList({ questionIds }) {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (!questionIds || questionIds.length === 0) {
      setQuestions([]);
      return;
    }
    async function fetchQuestions() {
      const snapshot = await getDocs(collection(db, "questions"));
      const allQuestions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = allQuestions.filter((q) => questionIds.includes(q.id));
      setQuestions(filtered);
    }
    fetchQuestions();
  }, [questionIds]);

  if (!questionIds || questionIds.length === 0) return <p>No questions selected.</p>;

  return (
    <div>
      <h3>Selected Questions</h3>
      <ol>
        {questions.map((q, i) => (
          <li key={q.id}>{q.text || q.id}</li>
        ))}
      </ol>
    </div>
  );
}
