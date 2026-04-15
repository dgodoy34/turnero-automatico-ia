"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function login() {

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      router.push("/panel");
    } else {
      alert(data.error);
    }
  }

  return (

    <div className="h-screen flex items-center justify-center">

      <div className="border p-6 rounded w-80 space-y-4">

        <h1 className="text-xl font-bold">Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border w-full p-2"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border w-full p-2"
        />

        <button
          onClick={login}
          className="bg-black text-white w-full p-2"
        >
          Entrar
        </button>

      </div>

    </div>
  );
}