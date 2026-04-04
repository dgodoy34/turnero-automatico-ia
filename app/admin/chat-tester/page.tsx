"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ChatTester() {

  const params = useSearchParams();
  const restaurantId = params.get("restaurant_id");

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {

    if (!input) return;

    const userMsg = { from: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {

      await fetch("/api/debug/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input,
          from: "TEST_USER_1",
          restaurant_id: restaurantId
        })
      });

      setMessages(prev => [
        ...prev,
        { from: "bot", text: "✔ Procesado" }
      ]);

    } catch (err) {

      setMessages(prev => [
        ...prev,
        { from: "bot", text: "❌ Error" }
      ]);

    }

    setLoading(false);
  }

  return (

    <div className="p-6 max-w-xl mx-auto">

      <h1 className="text-2xl font-bold mb-4">
        🤖 Chat Tester
      </h1>

      <div className="text-xs text-gray-500 mb-2">
        Restaurant: {restaurantId || "none"}
      </div>

      <div className="border rounded-lg h-[400px] overflow-y-auto p-4 space-y-2 bg-white">

        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded max-w-[70%] ${
              m.from === "user"
                ? "bg-green-100 ml-auto"
                : "bg-gray-100"
            }`}
          >
            {m.text}
          </div>
        ))}

      </div>

      <div className="flex gap-2 mt-4">

        <input
          className="border rounded px-3 py-2 w-full"
          value={input}
          onChange={(e)=>setInput(e.target.value)}
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 rounded"
        >
          Enviar
        </button>

      </div>

    </div>
  );
}