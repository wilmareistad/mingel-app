import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../services/firebase";

/**
 * Hook for admin event management
 * Handles: Auth check, event listening, navigation validation
 */
export function useAdminEvent(eventId, onNavigateToAdmin) {
  const [event, setEvent] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Check admin authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        onNavigateToAdmin();
        return;
      }
      setAdminId(user.uid);
      setLoading(false);
    });
    return unsubscribe;
  }, [onNavigateToAdmin]);

  // Listen to event changes
  useEffect(() => {
    if (!eventId) return;

    const eventRef = doc(db, "events", eventId);
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        const eventData = { id: docSnap.id, ...docSnap.data() };
        setEvent(eventData);

        if (adminId && eventData.adminId !== adminId) {
          onNavigateToAdmin();
          return;
        }
      } else {
        setMessage("Event not found");
      }
    });

    // Handle tab visibility to refresh listener when user switches tabs
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible - trigger a re-fetch to ensure data is current
        // The listener above will handle the update
        console.log("📍 Tab became visible, listener should have latest data");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [eventId, adminId, onNavigateToAdmin]);

  return {
    event,
    adminId,
    loading,
    message,
    setMessage,
  };
}
