import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setTemp, clearTemp } from "@/lib/conversation";

// ==========================
// 🔥 SEND REPLY (FIX DEBUG)
// ==========================
async function sendReply(to: string, reply: string) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: reply },
  };

  console.log("📤 ENVIANDO:", JSON.stringify(payload, null, 2));

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.text();
  console.log("📥 RESPUESTA META:", data);
}

// ==========================
// 🔥 VERIFY WEBHOOK (GET)
// ==========================
export async function GET(req: Request) {
  return new Response("Webhook activo");
}

// ==========================
// 🔥 WEBHOOK (POST)
// ==========================
export async function POST(req: Request) {
  console.log("🔥 WEBHOOK HIT");

  try {
    const body = await req.json();

    console.log("📩 BODY:", JSON.stringify(body, null, 2));

    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // 🔥 SI NO HAY MENSAJE
    if (!message) {
      console.log("⚠️ EVENTO SIN MESSAGE");
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    // 🔥 SI NO ES TEXTO
    if (message.type !== "text") {
      console.log("⚠️ NO ES TEXTO:", message.type);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    console.log("📩 MESSAGE:", JSON.stringify(message, null, 2));

    const from = message.from;
    const text = message.text.body.trim();

    console.log(`📨 MENSAJE DE ${from}: ${text}`);

    // ==========================
    // 🔥 TEST SIMPLE (PRIMERO)
    // ==========================
    // 👉 esto es CLAVE para ver si responde
    if (text.toLowerCase() === "test") {
      await sendReply(from, "🔥 BOT FUNCIONANDO");
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    // ==========================
    // 🔥 SESSION
    // ==========================
    const session = await getSession(from);

    console.log("🧠 STATE:", session?.state);

    // ==========================
    // 🔥 RESPUESTA BÁSICA
    // ==========================
    let reply = "";

    if (!session?.state || session.state === "INIT") {
      reply = "Hola 👋 ¿Querés hacer una reserva?";
      await setState(from, "INIT");
    } else {
      reply = "Recibí tu mensaje 👍";
    }

    await sendReply(from, reply);

    return new Response("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ ERROR WEBHOOK:", err);

    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}