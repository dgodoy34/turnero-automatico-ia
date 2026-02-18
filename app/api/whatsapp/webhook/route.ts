export async function POST(req: Request) {
  const body = await req.json();

  // RESPONDER INMEDIATO A META (obligatorio <3s)
  setTimeout(async () => {
    try {
      const change = body?.entry?.[0]?.changes?.[0];
      if (!change) return;

      const value = change.value;
      const message = value?.messages?.[0];
      if (!message || message.type !== "text") return; // Solo procesamos mensajes de texto por ahora

      const from = message.from;
      const text = message.text?.body?.toLowerCase().trim() || "";

      console.log("📩 Mensaje recibido:", text, "De:", from);

      let reply = "No entendí el mensaje 🤔";

      if (text.includes("hola")) {
        reply = "¡Hola! 👋 Soy el asistente automático.\nEscribí *turno* para sacar un turno.";
      } else if (text.includes("turno")) {
        reply = "Perfecto 👍\nDecime tu DNI para continuar.";
      } else if (/^\d{7,8}$/.test(text)) {
        // Opcional: podés agregar lógica de DNI aquí
        reply = "Gracias 🙌\nAhora decime tu nombre y apellido.";
      }

      // Preparar timeout para fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos max

      const response = await fetch(
        `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
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
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Error de Meta:", response.status, errorData);
        return;
      }

      const data = await response.json();
      console.log("✅ Respuesta enviada exitosamente:", JSON.stringify(data, null, 2));

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error("❌ Fetch abortado por timeout (10s)");
      } else {
        console.error("❌ Error procesando/enviando mensaje:", err.message || err);
      }
    }
  }, 0);

  return new Response("EVENT_RECEIVED", { status: 200 });
}