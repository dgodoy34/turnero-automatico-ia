export async function sendWhatsAppMessage(to: string, reply: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: reply },
        }),
      }
    );

    const text = await res.text();

    console.log("📨 WHATSAPP STATUS:", res.status);
    console.log("📨 WHATSAPP RESPONSE:", text);

    if (!res.ok) {
      throw new Error("Error enviando WhatsApp");
    }

  } catch (err) {
    console.error("❌ WHATSAPP ERROR:", err);
    throw err;
  }
}