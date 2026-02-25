import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { interpretMessage } from "@/lib/ai";

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
    const change = body?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text")
      return new Response("EVENT_RECEIVED", { status: 200 });

    const from = message.from;
    const text = message.text.body.trim();
    const lower = text.toLowerCase();

    const session = await getSession(from);
    let reply = "No entendí el mensaje 🤔";

    // =========================
    // NO TIENE DNI
    // =========================
    if (!session.dni) {

      if (!/^\d{7,8}$/.test(text)) {
        reply = "👋 Hola, para comenzar necesito tu DNI (7 u 8 números).";
      } else {

        await setDNI(from, text);

        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("dni", text)
          .maybeSingle();

        if (!client) {
          reply = "No estás registrado. Decime tu nombre completo.";
          await setState(from, "REGISTER_NAME");
        } else if (!client.email) {
          reply = `Hola ${client.name} 😊 Antes de continuar necesito tu email.`;
          await setState(from, "ASK_EMAIL");
        } else {
          reply =
            `Hola ${client.name} 😊\n\n` +
            `1️⃣ Hacer una reserva\n` +
            `2️⃣ Modificar una reserva existente`;

          await setState(from, "MENU");
        }
      }
    }

    // =========================
    // REGISTRAR NOMBRE
    // =========================
    else if (session.state === "REGISTER_NAME") {

      await supabase.from("clients").insert({
        dni: session.dni,
        name: text,
        phone: from,
      });

      reply = "Perfecto 🎉 Ahora necesito tu email.";
      await setState(from, "ASK_EMAIL");
    }

    // =========================
    // PEDIR EMAIL
    // =========================
    else if (session.state === "ASK_EMAIL") {

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(text)) {
        reply = "Ese email no parece válido 🤔";
      } else {

        await supabase
          .from("clients")
          .update({ email: text })
          .eq("dni", session.dni);

        reply =
          `Perfecto 👍\n\n` +
          `1️⃣ Hacer una reserva\n` +
          `2️⃣ Modificar una reserva existente`;

        await setState(from, "MENU");
      }
    }

    // =========================
    // MENU
    // =========================
    else if (session.state === "MENU") {

      if (lower === "1") {
        reply = "📅 ¿Para qué fecha querés venir? (ej: 12/03)";
        await setState(from, "ASK_DATE");
      }

      else if (lower === "2") {
        reply = "🔐 Pasame el código de reserva.";
      }

      else {
        const ai = await interpretMessage(text);

        if (ai.intent === "create_reservation") {
          reply = "📅 ¿Para qué fecha querés venir? (ej: 12/03)";
          await setState(from, "ASK_DATE");
        } else {
          reply =
            `1️⃣ Hacer una reserva\n` +
            `2️⃣ Modificar una reserva existente`;
        }
      }
    }

    // =========================
    // PEDIR FECHA
    // =========================
    else if (session.state === "ASK_DATE") {

      const formattedDate = formatDateToISO(text);

      await setTemp(from, { date: formattedDate });

      reply = "⏰ ¿A qué hora?";
      await setState(from, "ASK_TIME");
    }

    // =========================
    // PEDIR HORA
    // =========================
    else if (session.state === "ASK_TIME") {

      await setTemp(from, {
        ...session.temp_data,
        time: text,
      });

      reply = "👥 ¿Para cuántas personas?";
      await setState(from, "ASK_PEOPLE");
    }

    // =========================
    // PEDIR PERSONAS
    // =========================
    else if (session.state === "ASK_PEOPLE") {

      const people = parseInt(text);

      await setTemp(from, {
        ...session.temp_data,
        people,
      });

      const temp = {
        ...session.temp_data,
        people,
      };

      reply =
        `Confirmo:\n\n` +
        `📅 ${temp.date}\n` +
        `⏰ ${temp.time}\n` +
        `👥 ${temp.people}\n\n` +
        `¿Confirmamos? (si/no)`;

      await setState(from, "CONFIRM_RESERVATION");
    }

   // =========================
// CONFIRMAR RESERVA 🔥
// =========================
else if (session.state === "CONFIRM_RESERVATION") {

  if (lower === "si" || lower === "sí") {

    const temp = session.temp_data;

    const result = await createReservation({
      dni: session.dni,
      date: temp.date,
      time: temp.time,
      people: temp.people,
    });

    // 🔴 Si ya existe reserva
    if (!result.success) {

      reply =
        `${result.message}\n\n` +
        `¿Querés modificarla o cancelarla?\n\n` +
        `1️⃣ Modificar\n` +
        `2️⃣ Cancelar`;

      await setState(from, "EXISTING_CONFLICT");
      return;

    } 

    // 🟢 Reserva creada correctamente
    reply =
      `🎉 ¡Reserva confirmada!\n\n` +
      `📅 ${temp.date}\n` +
      `⏰ ${temp.time}\n` +
      `👥 ${temp.people}\n\n` +
      `🔐 Código: ${result.reservation.reservation_code}\n\n` +
      `¿Querés hacer otra reserva?\n\n` +
      `1️⃣ Sí, otra reserva\n` +
      `2️⃣ Finalizar`;

    await setTemp(from, {});
    await setState(from, "POST_CONFIRM");
  } 

  else {
    reply = "Reserva cancelada 👍";
    await setTemp(from, {});
    await setState(from, "MENU");
  }
}


// =========================
// DESPUÉS DE CONFIRMAR
// =========================
else if (session.state === "POST_CONFIRM") {

  if (lower === "1") {
    reply = "📅 ¿Para qué fecha querés venir?";
    await setState(from, "ASK_DATE");
  }

  else {
    reply = "Gracias por elegirnos 🙌 ¡Te esperamos!";
    await setState(from, "MENU");
  }
}


// =========================
// CONFLICTO DE RESERVA EXISTENTE
// =========================
else if (session.state === "EXISTING_CONFLICT") {

  if (lower === "1") {
    reply = "📅 Decime la nueva fecha.";
    await setState(from, "ASK_DATE");
  }

  else if (lower === "2") {

    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("client_dni", session.dni)
      .eq("date", session.temp_data?.date)
      .eq("time", session.temp_data?.time);

    reply = "Reserva cancelada 👍";
    await setTemp(from, {});
    await setState(from, "MENU");
  }

  else {
    reply = "1️⃣ Modificar\n2️⃣ Cancelar";
  }
}
    // =========================
    // RESPUESTA A META
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