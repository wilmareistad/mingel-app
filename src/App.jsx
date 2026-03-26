import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Join from "./pages/Join";
import CreateEvent from "./pages/CreateEvent";
import Lobby from "./pages/Lobby";
import Login from "./pages/Login";
import Tutorial from "./pages/Tutorial";
import AdminPanel from "./pages/AdminPanel";
import Game from "./pages/Game";
import Results from "./pages/Results";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import Header from './components/Header';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <>
      {/* Animated background (fixed, behind everything) */}
      <div className="animated-bg">
        <div className="gradient gradient1"></div>
        <div className="gradient gradient2"></div>
        <div className="gradient gradient3"></div>
      </div>

      {/* Main app content */}
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/join" element={<Join />} />
            <Route path="/create" element={<CreateEvent />} />
            <Route path="/lobby/:eventId" element={<Lobby />} />
            <Route path="/login" element={<Login />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route
              path="/admin"
              element={user ? <AdminPanel /> : <Navigate to="/login" />}
            />
            <Route path="/game/:eventId" element={<Game />} />
            <Route path="/results/:eventId" element={<Results />} />
          </Routes>
        </main>
      </BrowserRouter>
    </>
  );
}

export default App;
