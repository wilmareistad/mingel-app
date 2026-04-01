import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function AllQuestionsList({ publicQuestionIds, customQuestionIds }) {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    async function fetchQuestions() {
      const publicIds = publicQuestionIds || [];
      const customIds = customQuestionIds || [];

      if (publicIds.length === 0 && customIds.length === 0) {
        setQuestions([]);
        return;
      }

      // Fetch public questions
      let publicQuestions = [];
      if (publicIds.length > 0) {
        const snapshot = await getDocs(collection(db, "questions"));
        const allQuestions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        publicQuestions = allQuestions.filter((q) => publicIds.includes(q.id));
      }

      // Fetch custom questions
      let customQuestions = [];
      if (customIds.length > 0) {
        const snapshot = await getDocs(collection(db, "customQuestions"));
        const allQuestions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        customQuestions = allQuestions.filter((q) => customIds.includes(q.id));
      }

      // Combine in order: public first, then custom
      setQuestions([...publicQuestions, ...customQuestions]);
    }

    fetchQuestions();
  }, [publicQuestionIds, customQuestionIds]);

  const totalQuestions = (publicQuestionIds?.length || 0) + (customQuestionIds?.length || 0);

  if (totalQuestions === 0) return <p>No questions selected.</p>;

  return (
    <div>
      <h3>Questions ({questions.length})</h3>
      <ol>
        {questions.map((q) => (
          <li key={q.id}>{q.text || q.id}</li>
        ))}
      </ol>
    </div>
  );
}
