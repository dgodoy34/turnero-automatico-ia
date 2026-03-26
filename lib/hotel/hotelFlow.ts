export async function hotelFlow(body: any) {
  console.log("🏨 HOTEL FLOW ACTIVO");

  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message) return;

  const from = message.from;

  console.log("📩 Mensaje hotel de:", from);

  // 👉 respuesta simple para testear
  await fetch(
    `https://graph.facebook.com/v21.0/${process.env.HOTEL_PHONE_ID}/messages`,
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
        text: {
          body: "🏨 Sistema de hotel en construcción...",
        },
      }),
    }
  );
}