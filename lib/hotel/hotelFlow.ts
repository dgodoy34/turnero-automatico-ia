export async function hotelFlow(body: any) {
  try {
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

    if (!message || message.type !== "text") return

    const from = message.from
    const text = message.text.body.trim().toLowerCase()

    console.log("🏨 HOTEL:", from, text)

    // 👉 flujo básico
    let reply = ""

    if (text.includes("hola")) {
      reply = "👋 Bienvenido al hotel. ¿Qué fecha querés reservar?"
    } 
    
    else if (text.includes("/")) {
      reply = "Perfecto 👍 ¿Fecha de check-out?"
    } 
    
    else {
      reply = "🏨 Decime fechas (ej: 12/04 al 15/04)"
    }

    await sendReply(from, reply)

  } catch (error) {
    console.error("❌ hotelFlow error:", error)
  }
}

// 🔌 enviar mensaje
async function sendReply(to: string, reply: string) {
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
        to,
        type: "text",
        text: { body: reply },
      }),
    }
  )
}