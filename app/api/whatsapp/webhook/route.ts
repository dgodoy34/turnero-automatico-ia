export async function POST(req: Request) {
  const body = await req.json();

  // RESPONDER A META INMEDIATAMENTE
  setTimeout(async () => {
    try {
      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) return;

      const from = message.from;
      const text = message.text?.body?.toLowerCase() || "";

      let reply = "No entendí el mensaje 🤔";

      if (text.includes("hola"))
        reply = "¡Hola! 👋 Soy el asistente automático.\nEscribí *turno* para sacar un turno.";

      if (text.includes("turno"))
        reply = "Perfecto 👍\nDecime tu DNI para continuar.";

      await fetch(`https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
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
      });

      console.log("✅ RESPUESTA ENVIADA A WHATSAPP");
    } catch (err) {
      console.error("❌ Error enviando mensaje:", err);
    }
  }, 0);

  return new Response("EVENT_RECEIVED", { status: 200 });
}


