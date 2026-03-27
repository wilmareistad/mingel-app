import { useEffect, useState } from "react";
import { listenToUser } from "./userService";

/**
 * Hook to listen to current user data
 * Gets user ID from localStorage
 * @returns {object} { user, loading, error }
 */
export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const unsubscribe = listenToUser(userId, (userData) => {
        setUser(userData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  return { user, loading, error };
}
