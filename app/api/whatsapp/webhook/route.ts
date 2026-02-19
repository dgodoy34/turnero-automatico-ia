export async function POST(req: Request) {
  try {
    const body = await req.json();

    const change = body?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text")
      return new Response("EVENT_RECEIVED", { status: 200 });

    const from = message.from;
    const text = message.text?.body?.toLowerCase().trim() || "";

    console.log("📩 Mensaje recibido:", text, "De:", from);

    let reply = "No entendí el mensaje 🤔";

    if (text.includes("hola"))
      reply = "¡Hola! 👋 Soy el asistente automático.\nEscribí *turno* para sacar un turno.";
    else if (text.includes("turno"))
      reply = "Perfecto 👍\nDecime tu DNI para continuar.";
    else if (/^\d{7,8}$/.test(text))
      reply = "Gracias 🙌\nAhora decime tu nombre y apellido.";

    console.log("⏳ Enviando respuesta a Meta...");

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
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

    const data = await response.text();
    console.log("📡 Meta respondió:", response.status, data);

    return new Response("EVENT_RECEIVED", { status: 200 });

  } catch (err: any) {
    console.error("❌ ERROR GENERAL:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}
