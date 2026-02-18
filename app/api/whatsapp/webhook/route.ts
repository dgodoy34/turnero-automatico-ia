export async function POST(req: Request) {
  const body = await req.json();

  // RESPONDER INMEDIATO A META (obligatorio <3s)
  setTimeout(async () => {
    try {
      const change = body?.entry?.[0]?.changes?.[0];
      if (!change) return;

      const value = change.value;
      const message = value?.messages?.[0];
      if (!message || message.type !== "text") return;

      const from = message.from;
      const text = message.text?.body?.toLowerCase().trim() || "";

      console.log("📩 Mensaje recibido:", text, "De:", from);

      let reply = "No entendí el mensaje 🤔";

      if (text.includes("hola")) {
        reply = "¡Hola! 👋 Soy el asistente automático.\nEscribí *turno* para sacar un turno.";
      } else if (text.includes("turno")) {
        reply = "Perfecto 👍\nDecime tu DNI para continuar.";
      } else if (/^\d{7,8}$/.test(text)) {
        reply = "Gracias 🙌\nAhora decime tu nombre y apellido.";
      }

      // Preparar timeout más largo (15s) y headers para conexiones lentas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      console.log("⏳ Iniciando fetch a Meta...");

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
            "Connection": "keep-alive",  // Intenta mantener conexión
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: reply },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      console.log("📡 Fetch completado, status:", response.status);

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Meta rechazó:", response.status, data);
      } else {
        console.log("✅ Respuesta enviada exitosamente:", JSON.stringify(data, null, 2));
      }

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error("❌ Fetch abortado por timeout (15s)");
      } else {
        console.error("❌ Error procesando/enviando mensaje:", err.message || err);
      }
    }
  }, 0);

  return new Response("EVENT_RECEIVED", { status: 200 });
}