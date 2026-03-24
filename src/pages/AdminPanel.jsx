import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Admin Panel</h1>
      <button onClick={() => navigate("/create")}>Create Event</button>
    </div>
  );
}