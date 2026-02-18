export async function POST(req: Request) {
  const body = await req.json();

  // RESPONDER INMEDIATO A META
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("⏰ Abort manual por timeout de 8s");
      }, 8000);  // Bajado a 8s para que se loguee antes del corte de Netlify

      console.log("⏳ Iniciando fetch a Meta... (versión v21.0)");

      const startTime = Date.now();

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
            "Connection": "keep-alive",
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

      const duration = Date.now() - startTime;
      console.log(`📡 Fetch completado en ${duration}ms, status:`, response.status);

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Meta rechazó:", response.status, data);
      } else {
        console.log("✅ Respuesta enviada exitosamente:", JSON.stringify(data, null, 2));
      }

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error("❌ Fetch abortado por timeout (8s)");
      } else {
        console.error("❌ Error en fetch/procesamiento:", err.message || err, err.stack);
      }
    }
  }, 0);

  return new Response("EVENT_RECEIVED", { status: 200 });
}