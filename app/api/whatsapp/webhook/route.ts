import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

/* ------------------ VERIFICACION META ------------------ */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/* ------------------ RECIBIR MENSAJES ------------------ */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return NextResponse.json({ received: true });

    const from = message.from;
    const text = message.text?.body?.toLowerCase() || "";

    console.log("📩 Mensaje:", text, "De:", from);

    let reply = "No entendí el mensaje 🤔";

    if (text.includes("hola"))
      reply = "¡Hola! 👋 Soy el asistente automático.\nEscribí *turno* para sacar un turno.";

    if (text.includes("turno"))
      reply = "Perfecto 👍\nDecime tu DNI para continuar.";

    /* ----------- RESPUESTA A WHATSAPP ----------- */
    const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    to: from,
    type: "text",
    text: { body: reply },
  }),
});

const data = await response.text();
console.log("📤 WhatsApp response:", data);

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error("❌ Error webhook:", err.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}

