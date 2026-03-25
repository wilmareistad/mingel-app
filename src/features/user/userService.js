import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";

/**
 * Listen to user data in real-time
 * @param {string} userId - User ID
 * @param {function} callback - Called with user data when it changes
 * @returns {function} Unsubscribe function
 */
export function listenToUser(userId, callback) {
  const userRef = doc(db, "users", userId);

  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({
        id: docSnap.id,
        ...docSnap.data()
      });
    }
  });

  return unsubscribe;
}

/**
 * Listen to all users in an event
 * @param {string} eventId - Event ID
 * @param {function} callback - Called with array of users when they change
 * @returns {function} Unsubscribe function
 */
export function listenToEventUsers(eventId, callback) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("eventId", "==", eventId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(users);
  });

  return unsubscribe;
}
