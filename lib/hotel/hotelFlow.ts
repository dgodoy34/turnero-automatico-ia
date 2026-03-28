import { getSession, setState, setTemp } from "@/lib/conversation"
import { createBooking } from "@/lib/hotel/createBooking"
import { checkAvailability } from "@/lib/hotel/checkAvailability"

// =========================
// 🧠 PARSE FECHAS ROBUSTO
// =========================
function parseDateRange(text: string) {
  const clean = text
    .toLowerCase()
    .replace(/desde|del/g, "")
    .replace(/hasta|al/g, "a")
    .replace(/\s+/g, " ")
    .trim()

  const regex = /(\d{1,2})\/(\d{1,2})\s*a\s*(\d{1,2})\/(\d{1,2})/
  const match = clean.match(regex)

  if (!match) return null

  const today = new Date()
  const year = today.getFullYear()

  const checkIn = `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
  const checkOut = `${year}-${match[4].padStart(2, "0")}-${match[3].padStart(2, "0")}`

  return { checkIn, checkOut }
}

// =========================
// 📤 RESPUESTA
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

// =========================
// 🏨 HOTEL FLOW
// =========================
export async function hotelFlow(body: any) {
  try {
    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

    if (!message || message.type !== "text") return

    const from = message.from
    const text = message.text.body.trim()
    const lower = text.toLowerCase()

    const session = await getSession(from)

    let reply = ""

    console.log("🏨 HOTEL STATE:", session.state)
    console.log("RAW:", text)
// =========================
// INICIO
// =========================
    if (!session.state || session.state === "INIT") {
  reply = "📅 Decime fechas (ej: 12/04 al 15/04)"
  await setState(from, "HOTEL_ASK_DATES")

  await sendReply(body, from, reply)
  return
}

    // =========================
// FECHAS (PRIORIDAD MÁXIMA)
// =========================
else if (session.state === "HOTEL_ASK_DATES") {

  console.log("📅 PARSEANDO FECHA:", text)

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

  await sendReply(body, from, reply)
  return
}
    // =========================
    // PERSONAS
    // =========================
    else if (session.state === "HOTEL_ASK_GUESTS") {

      const guests = parseInt(text)

      if (isNaN(guests) || guests <= 0) {
        reply = "Cantidad inválida 😕"
        await sendReply(body, from, reply)
        return
      }

      await setTemp(from, {
        ...session.temp_data,
        guests
      })

      reply = "🛏️ Tipo de habitación (single / doble / suite)"
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

      if (lower !== "si" && lower !== "sí") {
        reply = "Cancelado 👍"
        await setState(from, "INIT")
        await sendReply(body, from, reply)
        return
      }

      const availability = await checkAvailability({
        checkIn: temp.checkIn,
        checkOut: temp.checkOut,
        roomType: temp.room
      })

      if (availability.available <= 0) {
        reply = "❌ No hay disponibilidad"
        await sendReply(body, from, reply)
        return
      }

      const result = await createBooking({
        phone: from,
        checkIn: temp.checkIn,
        checkOut: temp.checkOut,
        guests: temp.guests,
        roomType: temp.room
      })

      if (!result.success) {
        reply = "❌ Error al guardar"
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
    console.error("❌ HOTEL ERROR:", error)
  }
}