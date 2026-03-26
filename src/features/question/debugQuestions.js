// Debug helper to check what's in the database
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

export async function debugQuestions() {
  console.log("=== QUESTION DEBUG ===");
  
  const questionsRef = collection(db, "questions");
  const snapshot = await getDocs(questionsRef);
  
  console.log("Total questions in database:", snapshot.size);
  
  const allQuestions = snapshot.docs.map(doc => ({
    id: doc.id,
    text: doc.data().text?.substring(0, 50) + "..." || "NO TEXT",
    options: doc.data().options
  }));
  
  allQuestions.sort((a, b) => a.id.localeCompare(b.id));
  
  console.table(allQuestions);
  console.log("Sorted order:", allQuestions.map(q => q.id).join(", "));
  
  return allQuestions;
}
