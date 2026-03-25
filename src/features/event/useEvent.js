import { useEffect, useState } from "react";
import { listenToEvent } from "./eventService";

/**
 * Hook to listen to event changes
 * @param {string} eventId - Event ID from params or localStorage
 * @returns {object} { event, loading, error }
 */
export function useEvent(eventId) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const unsubscribe = listenToEvent(eventId, (eventData) => {
        setEvent(eventData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [eventId]);

  return { event, loading, error };
}
