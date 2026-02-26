import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { updateReservation } from "@/lib/updateReservation";


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
        await setState(from, "ASK_MODIFY_CODE");
      }

      else {
        reply =
          `1️⃣ Hacer una reserva\n` +
          `2️⃣ Modificar una reserva existente`;
      }
    }

    // =========================
    // PEDIR CÓDIGO PARA MODIFICAR
    // =========================
    else if (session.state === "ASK_MODIFY_CODE") {

      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("reservation_code", text)
        .eq("status", "confirmed")
        .single();

      if (!data) {
        reply = "No encontré una reserva activa con ese código.";
      } else {
        await setTemp(from, { reservation_code: text });
        reply = "📅 Decime la nueva fecha.";
        await setState(from, "MODIFY_DATE");
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

  const updatedTemp = {
    ...session.temp_data,
    people,
  };

  await setTemp(from, updatedTemp);

  reply =
    `Confirmo:\n\n` +
    `📅 ${updatedTemp.date}\n` +
    `⏰ ${updatedTemp.time}\n` +
    `👥 ${updatedTemp.people}\n\n` +
    `¿Confirmamos? (si/no)`;

  const isModify = !!updatedTemp.reservation_code;

  await setState(from, isModify ? "CONFIRM_MODIFY" : "CONFIRM_RESERVATION");
}
    // =========================
    // CONFIRMAR RESERVA NUEVA
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

        if (!result.success) {

          reply =
            `${result.message}\n\n` +
            `¿Querés modificarla?\n\n` +
            `1️⃣ Sí\n` +
            `2️⃣ No`;

          await setState(from, "MENU");

        } else {

  reply =
    `🎉 ¡Reserva confirmada!\n\n` +
    `📅 ${temp.date}\n` +
    `⏰ ${temp.time}\n` +
    `👥 ${temp.people}\n\n` +
    `🔐 Código: ${result.reservation.reservation_code}\n\n` +
    `¿Querés agregar algo más?\n\n` +
    `1️⃣ Ver la carta 📖\n` +
    `2️⃣ Agregar una nota ✍️\n` +
    `3️⃣ Nada más`;

  await setTemp(from, {
    reservation_code: result.reservation.reservation_code
  });

  await setState(from, "POST_CONFIRM_OPTIONS");
}

      } else {
        reply = "Reserva cancelada 👍";
        await setState(from, "MENU");
      }
    }

  // =========================
// CONFIRMAR MODIFICACIÓN
// =========================
else if (session.state === "CONFIRM_MODIFY") {

  if (lower === "si" || lower === "sí") {

    const temp = session.temp_data;

    if (
      !temp ||
      !temp.reservation_code ||
      !temp.date ||
      !temp.time ||
      temp.people === undefined
    ) {
      reply = "Error interno al modificar la reserva.";
      await setTemp(from, {});
      await setState(from, "MENU");
    } else {

      const {
        reservation_code,
        date,
        time,
        people,
      } = temp as {
        reservation_code: string;
        date: string;
        time: string;
        people: number;
      };

      const result = await updateReservation({
        reservation_code,
        date,
        time,
        people,
      });

      if (!result.success) {
        reply = result.message ?? "No se pudo modificar la reserva.";
      } else reply =
  `🎉 ¡Reserva confirmada!\n\n` +
  `📅 ${temp.date}\n` +
  `⏰ ${temp.time}\n` +
  `👥 ${temp.people}\n\n` +
  `🔐 Código: ${result.reservation.reservation_code}\n\n` +
  `¿Querés agregar algo más?\n\n` +
  `1️⃣ Ver la carta 📖\n` +
  `2️⃣ Agregar una nota ✍️\n` +
  `3️⃣ Nada más`;

await setTemp(from, {
  reservation_code: result.reservation.reservation_code
});

await setState(from, "POST_CONFIRM_OPTIONS");
    }

  } else {
    reply = "Modificación cancelada 👍";
    await setState(from, "MENU");
  }
}

// =========================
// POST CONFIRM OPTIONS
// =========================
else if (session.state === "POST_CONFIRM_OPTIONS") {

  if (lower === "1") {
    reply = "📖 Te paso nuestra carta:\nhttps://turestaurante.com/carta";
  }

  else if (lower === "2") {
    reply = "✍️ Escribí la nota que querés agregar (ej: celíaco, cumpleaños, alergia).";
    await setState(from, "ADD_NOTE");
    return;
  }

  else {
    reply = "Perfecto 🙌 Te esperamos!";
    await setTemp(from, {});
    await setState(from, "MENU");
  }
}
// =========================
// ADD NOTE
// =========================
else if (session.state === "ADD_NOTE") {

  const reservationCode = session.temp_data?.reservation_code;

  if (!reservationCode) {
    reply = "No pude encontrar la reserva.";
    await setState(from, "MENU");
  } else {

    await supabase
      .from("appointments")
      .update({ notes: text })
      .eq("reservation_code", reservationCode);

    reply = "📝 Nota agregada correctamente.\n\n¡Te esperamos! 🙌";

    await setTemp(from, {});
    await setState(from, "MENU");
  }
}
// =========================
// NUEVA FECHA MODIFICACIÓN
// =========================
else if (session.state === "MODIFY_DATE") {

  const formattedDate = formatDateToISO(text);

  await setTemp(from, {
    ...session.temp_data,
    date: formattedDate,
  });

  reply = "⏰ Decime la nueva hora.";
  await setState(from, "MODIFY_TIME");
}

// =========================
// NUEVA HORA MODIFICACIÓN
// =========================
else if (session.state === "MODIFY_TIME") {

  await setTemp(from, {
    ...session.temp_data,
    time: text,
  });

  reply = "👥 ¿Para cuántas personas?";
  await setState(from, "ASK_PEOPLE");
}

// =========================
// POST RESERVATION
// =========================
else if (session.state === "POST_RESERVATION") {

  if (lower === "1") {
    reply = "🔐 Pasame el código de la reserva.";
    await setState(from, "ASK_MODIFY_CODE");
  }

  else if (lower === "2") {
    reply =
      `1️⃣ Hacer una reserva\n` +
      `2️⃣ Modificar una reserva existente`;
    await setState(from, "MENU");
  }

  else {
    reply =
      `¿Qué querés hacer?\n\n` +
      `1️⃣ Modificar esta reserva\n` +
      `2️⃣ Volver al menú`;
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