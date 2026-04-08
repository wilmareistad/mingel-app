import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import style from "./Login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin");
    } catch (error) {
      setMessage("Wrong email or password");
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setMessage("Fill in all fields");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/admin");
    } catch (error) {
      console.log(error.code);
      setMessage(error.message);
    }
  };

  return (
    <div className={style.logindiv}>
      <h1>Admin Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className={style.loginBtn} onClick={handleLogin}>
        Login
      </button>
      <button className={style.loginBtn} onClick={handleRegister}>
        Create account
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}
