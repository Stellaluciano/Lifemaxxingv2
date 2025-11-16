import React, { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  async function handleLogin() {
    try {
      setErrorMsg("");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Log In</h1>

        <input
          type="email"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleLogin}>
          Log In
        </button>

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f7f9fc, #e8efff)",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "380px",
    background: "white",
    padding: "32px",
    borderRadius: "20px",
    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    marginBottom: "24px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    margin: "8px 0",
    borderRadius: "12px",
    border: "1px solid #d0d7e2",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "14px 16px",
    marginTop: "12px",
    background: "#2d57ff",
    color: "white",
    fontSize: "17px",
    fontWeight: "500",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
  },
  error: {
    marginTop: "12px",
    color: "red",
    fontSize: "14px",
  },
};
