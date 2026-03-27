import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleManageGame = () => {
    if (user) {
      // User is logged in, go to admin panel
      navigate("/admin");
    } else {
      // User is not logged in, go to login page
      navigate("/login");
    }
  };

  return (
    <div>
      <h1>Pulse</h1>

      <div className="button-container">
        <button onClick={() => navigate("/join")}>Join Game</button>

        <button onClick={handleManageGame}>Manage Game</button>

        <button className="home_button_to_tutorial" onClick={() => navigate("/tutorial")}>Tutorial</button>
      </div>
    </div>
  );
}
