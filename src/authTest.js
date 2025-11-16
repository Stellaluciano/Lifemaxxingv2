import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export async function testSignup() {
  try {
    console.log("Attempting signup...");
    const email = "testuser@example.com";
    const password = "test1234";

    const result = await createUserWithEmailAndPassword(auth, email, password);

    console.log("User created successfully:");
    console.log(result.user);
  } catch (error) {
    console.error("Signup error:", error);
  }
}
