import { getSession, setState, setTemp } from "@/lib/conversation"

export async function hotelFlow(body: any) {
  try {
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (!message || message.type !== "text") return

    const from = message.from
    const text = message.text.body.trim()
    const lower = text.toLowerCase()

    const session = await getSession(from)

    let reply = ""

    console.log("🏨 HOTEL STATE:", session.state)

    // =========================
    // INICIO
    // =========================
    if (session.state === "INIT") {
      reply = "📅 Decime fechas (ej: 12/04 al 15/04)"
      await setState(from, "HOTEL_ASK_DATES")
    }

    // =========================
    // FECHAS
    // =========================
    else if (session.state === "HOTEL_ASK_DATES") {

      await setTemp(from, {
        ...session.temp_data,
        dates: text
      })

      reply = "👥 ¿Cuántas personas?"
      await setState(from, "HOTEL_ASK_GUESTS")
    }

    // =========================
    // PERSONAS
    // =========================
    else if (session.state === "HOTEL_ASK_GUESTS") {

      await setTemp(from, {
        ...session.temp_data,
        guests: text
      })

      reply = "🛏️ ¿Tipo de habitación? (single / doble / suite)"
      await setState(from, "HOTEL_ASK_ROOM")
    }

    // =========================
    // HABITACIÓN
    // =========================
    else if (session.state === "HOTEL_ASK_ROOM") {

      await setTemp(from, {
        ...session.temp_data,
        room: text
      })

      const temp = session.temp_data

      reply =
        `Confirmo:\n` +
        `📅 ${temp.dates}\n` +
        `👥 ${temp.guests}\n` +
        `🛏️ ${text}\n\n` +
        `¿Confirmás? (si/no)`

      await setState(from, "HOTEL_CONFIRM")
    }

    // =========================
    // CONFIRMAR
    // =========================
    else if (session.state === "HOTEL_CONFIRM") {

      if (lower === "si" || lower === "sí") {
        reply = "🏨 Reserva registrada (modo demo)"
        await setState(from, "INIT")
      } else {
        reply = "Ok 👍 cancelado"
        await setState(from, "INIT")
      }
    }

    // =========================
    // DEFAULT
    // =========================
    else {
      reply = "🏨 Escribí 'hotel' para empezar"
      await setState(from, "INIT")
    }

    await sendReply(body, from, reply)

  } catch (error) {
    console.error("❌ hotelFlow error:", error)
  }
}


// 🔌 enviar mensaje dinámico (IMPORTANTE)
async function sendReply(body: any, to: string, reply: string) {

  const phoneId =
    body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id

  await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
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