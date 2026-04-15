
  "use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // 🔥 IMPORTANTE
      },
      body: JSON.stringify({ email, password }),
    });

    
    const data = await res.json();
console.log("LOGIN RESPONSE:", data);

    if (data.ok) {
      window.location.href = "/panel";
    } else {
      alert("Login incorrecto");
    }
  };

  return (
    <div>
      <h1>Login</h1>

      <input
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>
        Ingresar
      </button>
    </div>
  );
}