import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { updateReservation } from "@/lib/updateReservation";
import { interpretMessage } from "@/lib/ai";
import { getRestaurantId } from "@/lib/getRestaurantId";

function formatDateToISO(input: string) {
  const today = new Date();
  const currentYear = today.getFullYear();

  const clean = input.replace(/-/g, "/").trim();
  const parts = clean.split("/");

  if (parts.length === 2) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    return `${currentYear}-${month}-${day}`;
  }

  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year =
      parts[2].length === 2 ? `20${parts[2]}` : parts[2];

    return `${year}-${month}-${day}`;
  }

  return input;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    const from = message.from;
    const text = message.text.body.trim();
    const lower = text.toLowerCase();

    const session = await getSession(from);

    const restaurantId = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("phone_number_id", process.env.WHATSAPP_PHONE_NUMBER_ID)
      .single();

    if (!restaurant) {
      console.error("❌ Restaurante no encontrado");
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    let reply = "No entendí 🤔";

    // =========================
    // ESTADO INICIAL (IA)
    // =========================

    if (!session.state || session.state === "INIT") {

      const ai = await interpretMessage(text);
      console.log("AI:", ai);

      if (ai.intent === "greeting") {
        reply = "Hola 😊 Bienvenido. ¿Querés hacer una reserva o consultar una existente?";
      }

      else if (ai.intent === "create_reservation") {

        await setTemp(from, {
          date: ai.date,
          time: ai.time,
          people: ai.people,
        });

        if (!ai.date) {
          reply = "📅 ¿Para qué día querés la reserva?";
          await setState(from, "ASK_DATE");
        }

        else if (!ai.time) {
          reply = "⏰ ¿A qué hora?";
          await setState(from, "ASK_TIME");
        }

        else if (!ai.people) {
          reply = "👥 ¿Para cuántas personas?";
          await setState(from, "ASK_PEOPLE");
        }

        else {
          reply = "Perfecto 👍 Solo necesito tu DNI para continuar.";
          await setState(from, "ASK_DNI");
        }
      }

      else if (ai.intent === "consult_reservation") {
        reply = "🔐 Para consultar tu reserva necesito el código.";
        await setState(from, "ASK_CODE");
      }

      else {
        reply = "Puedo ayudarte a hacer una reserva 😊";
      }
    }

    // =========================
    // FECHA
    // =========================
    else if (session.state === "ASK_DATE") {

      const date = formatDateToISO(text);

      await setTemp(from, {
        ...session.temp_data,
        date,
      });

      reply = "⏰ ¿A qué hora?";
      await setState(from, "ASK_TIME");
    }

    // =========================
    // HORA
    // =========================
    else if (session.state === "ASK_TIME") {

      const time = text.includes(":") ? text : `${text}:00`;

      await setTemp(from, {
        ...session.temp_data,
        time,
      });

      reply = "👥 ¿Para cuántas personas?";
      await setState(from, "ASK_PEOPLE");
    }

    // =========================
    // PERSONAS
    // =========================
    else if (session.state === "ASK_PEOPLE") {

      const people = parseInt(text);

      await setTemp(from, {
        ...session.temp_data,
        people,
      });

      reply = "Perfecto 👍 Ahora necesito tu DNI.";
      await setState(from, "ASK_DNI");
    }

    // =========================
    // DNI + REGISTRO
    // =========================
    else if (session.state === "ASK_DNI") {

      if (!/^\d{7,8}$/.test(text)) {
        reply = "El DNI debe tener 7 u 8 números.";
      } else {

        await setDNI(from, text);

        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("dni", text)
          .maybeSingle();

        if (!client) {

          await supabase.from("clients").upsert({
            dni: text,
            phone: from,
          });

          reply = "Perfecto 👍 ¿Cómo es tu nombre completo?";
          await setState(from, "REGISTER_NAME");

        } else {

          reply = `Perfecto ${client.name} 👍 ¿Confirmamos la reserva? (si/no)`;
          await setState(from, "CONFIRM_RESERVATION");
        }
      }
    }

    // =========================
    // REGISTRO
    // =========================
    else if (session.state === "REGISTER_NAME") {

      await supabase
        .from("clients")
        .update({ name: text })
        .eq("dni", session.dni);

      reply = "Perfecto 🎉 Ahora tu email.";
      await setState(from, "ASK_EMAIL");
    }

    else if (session.state === "ASK_EMAIL") {

      await supabase
        .from("clients")
        .update({ email: text })
        .eq("dni", session.dni);

      reply = "🎂 Tu fecha de cumpleaños (ej: 15/08)";
      await setState(from, "ASK_BIRTHDAY");
    }

    else if (session.state === "ASK_BIRTHDAY") {

      const birthday = formatDateToISO(text);

      await supabase
        .from("clients")
        .update({ birthday })
        .eq("dni", session.dni);

      reply = "Listo 🙌 ¿Confirmamos la reserva? (si/no)";
      await setState(from, "CONFIRM_RESERVATION");
    }

    // =========================
    // CONFIRMAR RESERVA
    // =========================
    else if (session.state === "CONFIRM_RESERVATION") {

      if (lower === "si" || lower === "sí") {

        const temp = session.temp_data;

        const result = await createReservation({
          restaurant_id: restaurant.id,
          dni: session.dni,
          date: temp.date,
          time: temp.time,
          people: temp.people,
        });

       if (!result.success) {
  reply = result.message ?? "No se pudo crear la reserva. Intentá nuevamente.";
  await setState(from, "INIT");
} else {

          reply =
            `🎉 Reserva confirmada\n\n` +
            `📅 ${temp.date}\n` +
            `⏰ ${temp.time}\n` +
            `👥 ${temp.people}\n\n` +
            `🔐 Código: ${result.reservation.reservation_code}\n\n` +
            `Gracias por elegirnos 🙌`;

          await setTemp(from, {});
          await setState(from, "INIT");
        }

      } else {
        reply = "Perfecto 👍 Avísame si necesitás algo.";
        await setState(from, "INIT");
      }
    }

    // =========================
    // CONSULTA
    // =========================
    else if (session.state === "ASK_CODE") {

      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("reservation_code", text)
        .maybeSingle();

      if (!data) {
        reply = "No encontré una reserva con ese código.";
      } else {

        reply =
          `📅 ${data.date}\n` +
          `⏰ ${data.time}\n` +
          `👥 ${data.people}\n\n` +
          `¿Querés modificarla? (si/no)`;

        await setTemp(from, { reservation_code: text });
        await setState(from, "CONFIRM_MODIFY");
      }
    }

    // =========================
    // RESPUESTA WHATSAPP
    // =========================
    await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
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
      }
    );

    return new Response("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}