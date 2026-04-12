import { useEffect, useRef } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

const AFK_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Hook to automatically kick a player if they are inactive for 15 minutes
 * Tracks activity via mouse movement, clicks, and keyboard input
 * 
 * @param {string} eventId - The event ID the player is in
 */
export function useAFKKick(eventId) {
  const lastActivityRef = useRef(Date.now());
  const afkTimeoutRef = useRef(null);

  // Function to remove player from event (AFK timeout)
  const removePlayerForAFK = async () => {
    const userId = sessionStorage.getItem("userId");
    const userDocId = sessionStorage.getItem("userDocId");

    console.log("⏱️ AFK timeout reached - removing player:", { userId, userDocId, eventId });

    if (userId && eventId) {
      try {
        await deleteDoc(doc(db, "events", eventId, "participants", userId));
        console.log("✅ Removed player from participants due to AFK");
      } catch (error) {
        console.warn("Could not delete participant on AFK:", error);
      }
    }

    if (userDocId) {
      try {
        await deleteDoc(doc(db, "users", userDocId));
        console.log("✅ Removed player from users due to AFK");
      } catch (error) {
        console.warn("Could not delete user doc on AFK:", error);
      }
    }

    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userDocId");
    sessionStorage.removeItem("eventId");
  };

  // Function to reset the AFK timer
  const resetAFKTimer = () => {
    lastActivityRef.current = Date.now();

    // Clear existing timeout
    if (afkTimeoutRef.current) {
      clearTimeout(afkTimeoutRef.current);
    }

    // Set new timeout
    afkTimeoutRef.current = setTimeout(() => {
      console.log("⏰ AFK timer expired - player inactive for 15 minutes");
      removePlayerForAFK();
    }, AFK_TIMEOUT);
  };

  // Set up activity listeners
  useEffect(() => {
    if (!eventId) return;

    // Activity events that reset the AFK timer
    const activityEvents = ["mousedown", "keydown", "click", "scroll", "touchstart"];

    const handleActivity = () => {
      resetAFKTimer();
    };

    // Add listeners for all activity events
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timer setup
    resetAFKTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      if (afkTimeoutRef.current) {
        clearTimeout(afkTimeoutRef.current);
      }
    };
  }, [eventId]);
}
