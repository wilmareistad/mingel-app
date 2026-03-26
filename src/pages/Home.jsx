import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Pulse</h1>

      <button onClick={() => navigate("/join")}>Join Game</button>

      <button onClick={() => navigate("/login")}>Manage Game</button>

      <button className="home_button_to_tutorial" onClick={() => navigate("/tutorial")}>Tutorial</button>
    </div>
  );
}
