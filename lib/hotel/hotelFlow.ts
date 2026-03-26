import { getSession, setState, setTemp } from "@/lib/conversation"
import { createBooking } from "@/lib/hotel/createBooking"
import { checkAvailability } from "@/lib/hotel/checkAvailability"

// =========================
// 🧠 PARSEAR FECHAS
// =========================
function parseDateRange(input: string) {
  const clean = input.toLowerCase().trim()

  const match = clean.match(
    /(\d{1,2}\/\d{1,2})\s*(al|-|a)\s*(\d{1,2}\/\d{1,2})/
  )

  console.log("PARSED:", match)

  if (!match) return null

  return {
    checkIn: match[1],
    checkOut: match[3]
  }
}


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

      const parsed = parseDateRange(text)

      if (!parsed) {
        reply = "❌ Formato inválido. Ej: 12/04 al 15/04"
        await sendReply(body, from, reply)
        return
      }

      await setTemp(from, {
        ...session.temp_data,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut
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

      const temp = {
        ...session.temp_data,
        room: text
      }

      reply =
        `Confirmo:\n` +
        `📅 ${temp.checkIn} → ${temp.checkOut}\n` +
        `👥 ${temp.guests}\n` +
        `🛏️ ${temp.room}\n\n` +
        `¿Confirmás? (si/no)`

      await setState(from, "HOTEL_CONFIRM")
    }

    // =========================
    // CONFIRMAR
    // =========================
    else if (session.state === "HOTEL_CONFIRM") {

  const temp = session.temp_data

  // 🔥 VALIDAR DISPONIBILIDAD ANTES
  const availability = await checkAvailability({
    checkIn: temp.checkIn,
    checkOut: temp.checkOut,
    roomType: temp.room
  })

  if (availability.available <= 0) {
    reply = "❌ No hay disponibilidad para esas fechas"
    await sendReply(body, from, reply)
    return
  }

  // 🔥 SI HAY DISPONIBILIDAD → CREA
  const result = await createBooking({
    phone: from,
    checkIn: temp.checkIn,
    checkOut: temp.checkOut,
    guests: temp.guests,
    roomType: temp.room
  })

  if (!result.success) {
    reply = "❌ Error al guardar la reserva"
  } else {
    reply =
      `🏨 *Reserva confirmada*\n\n` +
      `📅 ${temp.checkIn} → ${temp.checkOut}\n` +
      `👥 ${temp.guests}\n` +
      `🛏️ ${temp.room}\n\n` +
      `ID: ${result.booking.id}`
  }

  await setState(from, "INIT")
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


// =========================
// 📤 ENVIAR MENSAJE
// =========================
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