import React, { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  // ⚡ Google Sign-In
  async function handleGoogleSignup() {
    try {
      setErrorMsg("");

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const newUser = result.user;

      // Check if Firestore user doc exists
      const userRef = doc(db, "users", newUser.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          email: newUser.email,
          createdAt: serverTimestamp(),
        });
      }

      navigate("/");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    }
  }

  // Email/password signup
  async function handleEmailSignup() {
    try {
      if (!email || !password) {
        setErrorMsg("Please enter an email and password.");
        return;
      }

      setErrorMsg("");

      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCred.user;

      await setDoc(doc(db, "users", newUser.uid), {
        email: newUser.email,
        createdAt: serverTimestamp(),
      });

      navigate("/");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>

        {/* Google button */}
        <button style={styles.googleButton} onClick={handleGoogleSignup}>
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            style={{ width: 20, marginRight: 10 }}
          />
          Continue with Google
        </button>

        <div style={styles.divider}>or</div>

        {/* Email & password */}
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

        <button style={styles.button} onClick={handleEmailSignup}>
          Create Account
        </button>

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f7f9fc, #e8efff)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    textAlign: "center",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
  },
  googleButton: {
    width: "100%",
    padding: "12px 16px",
    background: "#fff",
    border: "1px solid #d0d7e2",
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  divider: {
    margin: "16px 0",
    fontSize: 14,
    color: "#888",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    margin: "10px 0",
    borderRadius: 12,
    border: "1px solid #d0d7e2",
    fontSize: 16,
  },
  button: {
    width: "100%",
    padding: "14px 16px",
    background: "#2d57ff",
    color: "#fff",
    fontSize: 17,
    fontWeight: 500,
    borderRadius: 12,
    marginTop: 12,
    cursor: "pointer",
    border: "none",
  },
  error: {
    marginTop: 12,
    color: "red",
    fontSize: 14,
  },
};
