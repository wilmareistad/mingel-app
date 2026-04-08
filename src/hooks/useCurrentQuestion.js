import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Hook for fetching the current question
 * Only fetches when currentQuestionIndex changes (not on every event update)
 * Prevents duplicate reads by limiting to question phase only
 */
export function useCurrentQuestion(event) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    if (!event || event.status !== "question") {
      setCurrentQuestion(null);
      setVoteCount(0);
      return;
    }

    const fetchCurrentQuestion = async () => {
      const allQuestionIds = [
        ...(event.questions || []),
        ...(event.customQuestions || []),
      ];

      const questionIndex = event.currentQuestionIndex || 0;
      if (questionIndex < allQuestionIds.length) {
        const questionId = allQuestionIds[questionIndex];

        // Try to fetch from public questions first
        let questionSnap = await getDoc(doc(db, "questions", questionId));

        // If not found in public, try custom questions
        if (!questionSnap.exists()) {
          questionSnap = await getDoc(doc(db, "customQuestions", questionId));
        }

        if (questionSnap.exists()) {
          setCurrentQuestion({
            id: questionSnap.id,
            ...questionSnap.data(),
          });
        } else {
          console.error("Question not found:", questionId);
          setCurrentQuestion(null);
        }
      }
    };

    fetchCurrentQuestion();
    // ✅ OPTIMIZED: Only depend on status and index changes
    // Removed event.questions and event.customQuestions to prevent re-fetches
    // when other event fields (timer, etc) change
  }, [event?.status, event?.currentQuestionIndex]);

  // Update vote count from participants (passed separately via listener)
  return { currentQuestion, voteCount, setVoteCount };
}
