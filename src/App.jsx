import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Join from "./pages/Join";
import CreateEvent from "./pages/CreateEvent";
import Lobby from "./pages/Lobby";
import Login from "./pages/Login";
import Tutorial from "./pages/Tutorial";
import AdminPanel from "./pages/AdminPanel";
import AdminSettings from "./pages/AdminSettings";
import AdminDebug from "./pages/AdminDebug";
import Game from "./pages/Game";
import Results from "./pages/Results";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import Header from './components/Header';
import { useTutorialVisited } from "./hooks/useTutorialVisited";
import LoadingScreen from "./components/LoadingScreen";

function TutorialRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkTutorialVisited } = useTutorialVisited();

  useEffect(() => {
    if (!checkTutorialVisited() && location.pathname !== "/tutorial") {
      navigate("/tutorial", { replace: true });
    }
  }, []);

  return null;
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Enforce minimum loading screen display time (0.8 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTimeElapsed(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Show loading screen until minimum time has elapsed
  if (!minLoadTimeElapsed) {
    return <LoadingScreen />;
  }

  return (
    <>
      <TutorialRedirect />
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
        <Route
          path="/admin/settings/:eventId"
          element={user ? <AdminSettings /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/debug"
          element={user ? <AdminDebug /> : <Navigate to="/login" />}
        />
        <Route path="/game/:eventId" element={<Game />} />
        <Route path="/results/:eventId" element={<Results />} />
      </Routes>
    </>
  );
}

function App() {
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setFirebaseLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  if (!firebaseLoaded) return <LoadingScreen />;

  return (
    <>
      {/* Animated background (fixed, behind everything) */}

      {/* Main app content */}
      <BrowserRouter>
        <div className="animated-bg">
          <div className="gradient gradient1"></div>
          <div className="gradient gradient2"></div>
          <div className="gradient gradient3"></div>
        </div>
        <Header />
        <main>
          <AppContent />
        </main>
      </BrowserRouter>
    </>
  );
}

export default App;
