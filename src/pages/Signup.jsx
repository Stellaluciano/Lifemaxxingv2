import React, { useEffect, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";  
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // If already logged in → redirect home
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  async function handleSignup() {
    try {
      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      // 1️⃣ Create the user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCred.user;

      // 2️⃣ Create Firestore user document
      await setDoc(doc(db, "users", newUser.uid), {
        email: newUser.email,
        createdAt: serverTimestamp(),
      });

      console.log("User created + Firestore document created.");

      // 3️⃣ Redirect to home silently
      navigate("/");

    } catch (err) {
      console.error("Signup error:", err);
      alert(err.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Your Account</h1>

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

        <button style={styles.button} onClick={handleSignup}>
          Create Account
        </button>

        <p style={styles.hint}>
          Your account will be created using Firebase Authentication.
        </p>
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
    color: "#333",
    letterSpacing: "-0.5px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    margin: "8px 0",
    borderRadius: "12px",
    border: "1px solid #d0d7e2",
    fontSize: "16px",
    outline: "none",
    transition: "0.2s",
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
    transition: "0.2s",
  },
  hint: {
    marginTop: "16px",
    fontSize: "14px",
    color: "gray",
  },
};
