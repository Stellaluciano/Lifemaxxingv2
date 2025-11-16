import React from "react";
import { testSignup } from "../authTest";

export default function AuthTest() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Auth Test Page</h2>
      <button onClick={testSignup}>Create Test User</button>
      <p>Open the console + check Firebase after clicking.</p>
    </div>
  );
}
