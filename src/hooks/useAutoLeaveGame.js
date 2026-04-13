import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Hook to automatically remove player from event when they:
 * - Close the tab/browser
 * - Navigate away from allowed game routes (including browser back button)
 * - Visit the main page or other unauthorized routes (redirects back to lobby)
 * 
 * Allowed routes while in a game:
 * - /lobby/{eventId} - Main lobby
 * - /game/{eventId} - Question answering
 * - /results/{eventId} - Results view
 * 
 * @param {string} eventId - The event ID the player is in
 */
export function useAutoLeaveGame(eventId) {
  const location = useLocation();
  const navigate = useNavigate();

  // Function to remove player from event (used on tab close)
  const removePlayerFromEvent = async () => {
    const userId = sessionStorage.getItem("userId");
    const userDocId = sessionStorage.getItem("userDocId");

    console.log("🗑️ removePlayerFromEvent called:", { userId, userDocId, eventId });

    if (userId && eventId) {
      try {
        // Delete from participants sub-collection
        await deleteDoc(doc(db, "events", eventId, "participants", userId));
        console.log("✅ Deleted from participants");
      } catch (error) {
        console.warn("Could not delete participant on leave:", error);
      }
    }

    if (userDocId) {
      try {
        // Delete from legacy users collection
        await deleteDoc(doc(db, "users", userDocId));
        console.log("✅ Deleted from users");
      } catch (error) {
        console.warn("Could not delete user doc on leave:", error);
      }
    }

    // Always clear sessionStorage to ensure they're logged out
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userDocId");
    sessionStorage.removeItem("eventId");
    console.log("✅ Cleared sessionStorage");
  };

  // Check if current route is allowed for this game
  const isAllowedRoute = () => {
    // Allowed routes: /lobby/{eventId}, /game/{eventId}, /results/{eventId}
    const pathMatch = location.pathname.match(/\/(lobby|game|results)\/([^/]+)/);
    
    if (!pathMatch) {
      // Not on an allowed route
      return false;
    }

    const currentEventId = pathMatch[2];
    
    // Check if the eventId in the URL matches the player's eventId
    if (currentEventId !== eventId) {
      // Player is trying to access a different event
      return false;
    }

    return true;
  };

  // Monitor location changes and redirect if they navigate to unauthorized routes
  useEffect(() => {
    if (!eventId) return;

    console.log("🔍 useAutoLeaveGame location check:", {
      currentPath: location.pathname,
      expectedEventId: eventId,
      isAllowed: isAllowedRoute()
    });

    // Check if player navigated to an unauthorized route
    if (!isAllowedRoute()) {
      console.log("❌ Player navigated to unauthorized route, removing from event and redirecting...");
      // Remove player from Firestore first
      removePlayerFromEvent();
      // Then redirect back to lobby
      navigate(`/lobby/${eventId}`);
    }
  }, [location.pathname, eventId, navigate]);

  // Handle tab close and page refresh
  useEffect(() => {
    if (!eventId) return;

    const handleBeforeUnload = () => {
      removePlayerFromEvent();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [eventId]);
}


