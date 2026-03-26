import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";

/**
 * Hook to get current Firebase Auth user
 * @returns {object} { user, loading, error }
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        setUser(authUser);
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
