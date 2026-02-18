import { NextResponse } from "next/server";

/* ================= CONFIG ================= */
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

/* =========================================================
   VERIFICACION DEL WEBHOOK (cuando lo conectas en META)
   ========================================================= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/* =========================================================
   RECIBIR MENSAJES (Meta exige responder en < 3s)
   ========================================================= */
export async function POST(req: Request) {
  const body = await req.json();

  // ⚡ Respondemos INMEDIATO a Meta
  setTimeout(() => processMessage(body), 0);

  return NextResponse.json({ received: true });
}

/* =========================================================
   PROCESAMIENTO REAL DEL MENSAJE (asincrono)
   ========================================================= */
async function processMessage(body: any) {
  try {
    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return;

    const from = message.from;
    const text = message.text?.body?.toLowerCase() || "";

    console.log("📩 Mensaje:", text, "De:", from);

    /* ================= LOGICA BOT ================= */

    let reply = "No entendí el mensaje 🤔";

    if (text.includes("hola"))
      reply =
        "¡Hola! 👋 Soy el asistente automático.\nEscribí *turno* para sacar un turno.";

    else if (text.includes("turno"))
      reply =
        "Perfecto 👍\nDecime tu DNI para continuar.";

    else if (/^\d{7,8}$/.test(text))
      reply =
        "Gracias 🙌\nAhora decime tu nombre y apellido.";

    /* ================= RESPUESTA A WHATSAPP ================= */

    const response = await fetch(
  `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
  {
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
  }
);

const data = await response.json();
console.log("📤 RESPUESTA META:", JSON.stringify(data, null, 2));


  } catch (err) {
    console.error("❌ Error procesando mensaje:", err);
  }
}
