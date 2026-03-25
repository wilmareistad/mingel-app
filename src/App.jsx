import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Join from "./pages/Join";
import CreateEvent from "./pages/CreateEvent";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Join />} />
        <Route path="/create" element={<CreateEvent />} />
        <Route path="/lobby/:eventId" element={<Lobby />} />
        <Route path="/game/:eventId" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;