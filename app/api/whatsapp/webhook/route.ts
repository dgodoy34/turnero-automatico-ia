import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { updateReservation } from "@/lib/updateReservation";
import { interpretMessage } from "@/lib/ai";
import { getRestaurantId } from "@/lib/getRestaurantId";

async function sendWhatsApp(to: string, body: string) {
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
        to,
        type: "text",
        text: { body },
      }),
    }
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

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
    const phoneNumberId = change?.value?.metadata?.phone_number_id;
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text")
      return new Response("EVENT_RECEIVED", { status: 200 });

    const from = message.from;
    const text = message.text.body.trim();
    const lower = text.toLowerCase();
    


    
    // =========================
// INTERPRETAR MENSAJE CON IA
// =========================

const ai = await interpretMessage(text);
const restaurantId = await getRestaurantId(
  process.env.WHATSAPP_PHONE_NUMBER_ID!
);

console.log("AI:", ai);
console.log("Restaurant ID:", restaurantId);

    const session = await getSession(from);
    let reply: string = "";

// =========================
// IA GLOBAL (FUERA DEL FLUJO)
// =========================


if (ai.intent === "cancel_reservation") {
  reply = "Para cancelar necesito tu código de reserva 🔐";
  await setState(from, "ASK_MODIFY_CODE");
}


 // =========================
// OBTENER RESTAURANTE
// =========================

const { data: restaurant } = await supabase
  .from("restaurants")
  .select("id")
  .eq("phone_number_id", phoneNumberId)
  .single();

if (!restaurant) {
  console.error("❌ Restaurante no encontrado");
  return new Response("EVENT_RECEIVED", { status: 200 });
}


    // =========================
    // NO TIENE DNI
    // =========================
    if (!session.dni) {

  if (!/^\d{7,8}$/.test(text)) {
    reply = `${getGreeting()} 😊 Bienvenido a nuestro restaurante.\n\nNecesito tu DNI (7 u 8 números).`;
    await sendWhatsApp(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  await setDNI(from, text);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("dni", text)
    .maybeSingle();

  if (!client) {
    reply = "Perfecto 👍 Ahora decime tu nombre completo.";
    await setState(from, "REGISTER_NAME");
    await sendWhatsApp(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  if (!client.email) {
    reply = `Hola ${client.name} 😊 Necesito tu email.`;
    await setState(from, "ASK_EMAIL");
    await sendWhatsApp(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  reply =
    `Hola ${client.name} 😊\n\n` +
    `1️⃣ Hacer una reserva\n` +
    `2️⃣ Modificar una reserva existente`;

  await setState(from, "MENU");
  await sendWhatsApp(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
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

    reply = "🎂 Perfecto. Ahora decime tu fecha de cumpleaños (ej: 15/08).";

    await setState(from, "ASK_BIRTHDAY");
  }
}

// =========================
// PEDIR CUMPLEAÑOS
// =========================
else if (session.state === "ASK_BIRTHDAY") {

  const formattedBirthday = formatDateToISO(text);

  await supabase
    .from("clients")
    .update({ birthday: formattedBirthday })
    .eq("dni", session.dni);

  reply =
    `Perfecto 👍\n\n` +
    `1️⃣ Hacer una reserva\n` +
    `2️⃣ Modificar una reserva existente`;

  await setState(from, "MENU");
}

   else if (session.state === "MENU") {

// =========================
// IA DECISIÓN PRINCIPAL
// =========================

// 👉 CREAR RESERVA
if (ai.intent === "create_reservation") {

  if (!session.dni) {
    reply = "Antes de reservar necesito tu DNI 😊";
    await setState(from, "ASK_DNI");
    return;
  }

  if (!ai.date) {
    reply = "📅 ¿Para qué fecha querés reservar?";
    await setState(from, "ASK_DATE");
    return;
  }

  if (!ai.time) {
    await setTemp(from, { date: ai.date });
    reply = "⏰ ¿A qué hora?";
    await setState(from, "ASK_TIME");
    return;
  }

  if (!ai.people) {
    await setTemp(from, {
      date: ai.date,
      time: ai.time,
    });
    reply = "👥 ¿Para cuántas personas?";
    await setState(from, "ASK_PEOPLE");
    return;
  }

  const result = await createReservation({
    restaurant_id: restaurant.id,
    dni: session.dni,
    date: ai.date,
    time: ai.time,
    people: ai.people,
  });

  if (!result.success) {
    reply = result.message ?? "No se pudo completar la reserva";
  } else {
    reply =
      `🎉 ¡Reserva confirmada!\n\n` +
      `📅 ${ai.date}\n` +
      `⏰ ${ai.time}\n` +
      `👥 ${ai.people}\n\n` +
      `🔐 Código: ${result.reservation.reservation_code}`;
  }

  await sendWhatsApp(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// 👉 MODIFICAR
if (ai.intent === "modify_reservation") {
  reply = "🔐 Pasame tu código de reserva y lo modificamos.";
  await setState(from, "ASK_MODIFY_CODE");
  await sendWhatsApp(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}
   }

  
    // =========================
// PEDIR CÓDIGO PARA MODIFICAR
// =========================
else if (session.state === "ASK_MODIFY_CODE") {

  // 🔥 ESCAPE INTELIGENTE
  if (
    lower.includes("no") ||
    lower.includes("no tengo") ||
    lower.includes("quiero") ||
    ai.intent === "create_reservation"
  ) {
    reply = "Perfecto 👍 vamos a hacer una nueva reserva.\n\n📅 Decime la fecha.";
    await setState(from, "ASK_DATE");
    return;
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("reservation_code", text)
    .eq("status", "confirmed")
    .maybeSingle();

  if (error) {
    reply = "Hubo un problema al validar el código. Intentá nuevamente.";
  }

  else if (!data) {
   reply =
  "No encontré una reserva activa con ese código 🤔\n\n" +
  "¿Querés hacer una nueva reserva?\n\n" +
  "1️⃣ Intentar nuevamente\n" +
  "2️⃣ Hacer una nueva reserva";
  }

  else {
    await setTemp(from, {
      ...session.temp_data,
      reservation_code: text,
    });

    reply = "📅 Decime la nueva fecha.";
    await setState(from, "MODIFY_DATE");
  }
}
    // =========================
    // PEDIR FECHA
    // =========================
   else if (session.state === "ASK_DATE") {

  const date = ai.date || formatDateToISO(text);

  if (!date) {
    reply = "Ingresá una fecha válida (ej: 12/03)";
  }

  else {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(date);

    if (selectedDate < today) {
      reply = "No podés reservar en una fecha pasada 📅\n\nDecime otra fecha.";
    } else {
      await setTemp(from, { date });
      reply = "⏰ ¿A qué hora?";
      await setState(from, "ASK_TIME");
    }
  }
}

    // =========================
    // PEDIR HORA
    // =========================
    else if (session.state === "ASK_TIME") {

  const time = ai.time || (text.includes(":") ? text : `${text}:00`);

  const now = new Date();
  const reservationDateTime =
    new Date(`${session.temp_data.date}T${time}:00`);

  if (reservationDateTime < now) {
    reply = "Ese horario ya pasó ⏰ Elegí otro.";
  } else {

    await setTemp(from, {
      ...session.temp_data,
      time,
    });

    reply = "👥 ¿Para cuántas personas?";
    await setState(from, "ASK_PEOPLE");
  }
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
  restaurant_id: restaurant.id,
  dni: session.dni,
  date: temp.date,
  time: temp.time,
  people: temp.people,
});

   if (!result.success) {

  reply =
    `${result.message}\n\n` +
    `¿Querés intentar con otra fecha?\n\n` +
    `1️⃣ Sí\n` +
    `2️⃣ No`;

  await setState(from, "NO_CAPACITY_OPTIONS");
} else {

      reply =
        `🎉 ¡Reserva confirmada!\n\n` +
        `📅 ${temp.date}\n` +
        `⏰ ${temp.time}\n` +
        `👥 ${temp.people}\n\n` +
        `🔐 Código: ${result.reservation.reservation_code}\n\n` +
        `¿Qué querés hacer ahora?\n\n` +
        `1️⃣ Ver la carta 📖\n` +
        `2️⃣ Agregar una nota ✍️\n` +
        `3️⃣ Modificar esta reserva 🔄\n` +
        `4️⃣ Finalizar`;

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

    const temp = session.temp_data as {
  reservation_code: string;
  date: string;
  time: string;
  people: number;
};

const result = await updateReservation({
  reservation_code: temp.reservation_code,
  date: temp.date,
  time: temp.time,
  people: temp.people,
});

    if (!result.success) {
      reply = "Hubo un problema al crear la reserva 😕 Probemos con otra fecha.";
      await setState(from, "MENU");
    } else {

      reply =
  `✅ Reserva modificada correctamente.\n\n` +
  `📅 ${temp.date}\n` +
  `⏰ ${temp.time}\n` +
  `👥 ${temp.people}\n\n` +
  `¿Qué querés hacer ahora?\n\n` +
  `1️⃣ Ver la carta 📖\n` +
  `2️⃣ Agregar una nota ✍️\n` +
  `3️⃣ Modificar nuevamente 🔄\n` +
  `4️⃣ Finalizar`;

await setState(from, "POST_CONFIRM_OPTIONS");
    }

  } else {
    reply = "Modificación cancelada 👍";
    await setState(from, "MENU");
  }
}

// =========================
// NO CAPACITY OPTIONS
// =========================
else if (session.state === "NO_CAPACITY_OPTIONS") {

  if (lower === "1" || lower === "si" || lower === "sí") {
    reply = "📅 Decime una nueva fecha.";
    await setState(from, "ASK_DATE");
  }

  else {
    reply = "Perfecto 🙌 Volvemos al menú.";
    await setState(from, "MENU");
  }
}


// =========================
// POST CONFIRM OPTIONS
// =========================
else if (session.state === "POST_CONFIRM_OPTIONS") {

  if (lower === "1") {
    reply =
      "📖 Te paso nuestra carta:\nhttps://turestaurante.com/carta\n\n" +
      "¿Qué querés hacer ahora?\n\n" +
      "1️⃣ Modificar esta reserva 🔄\n" +
      "2️⃣ Finalizar";

    await setState(from, "POST_NOTE_OPTIONS");
  }

  else if (lower === "2") {
    reply = "✍️ Escribí la nota que querés agregar (ej: celíaco, cumpleaños, alergia).";
    await setState(from, "ADD_NOTE");
  }

  else if (lower === "3") {
  reply = "🔄 Vamos a modificar la reserva.\n\n📅 Decime la nueva fecha.";
  await setState(from, "MODIFY_DATE");
}
  else if (lower === "4") {
    reply = "Perfecto 🙌 Gracias por elegirnos. ¡Te esperamos!";
    await setTemp(from, {});
    await setState(from, "MENU");
  }

  else {
    reply =
      `1️⃣ Ver la carta 📖\n` +
      `2️⃣ Agregar una nota ✍️\n` +
      `3️⃣ Modificar esta reserva 🔄\n` +
      `4️⃣ Finalizar`;
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

    reply =
      "📝 Nota agregada correctamente.\n\n" +
      "¿Qué querés hacer ahora?\n\n" +
      "1️⃣ Modificar esta reserva 🔄\n" +
      "2️⃣ Finalizar";

    await setState(from, "POST_NOTE_OPTIONS");
  }
}


// =========================
// POST NOTE OPTIONS
// =========================
else if (session.state === "POST_NOTE_OPTIONS") {

  if (lower === "1") {
    reply = "🔄 Vamos a modificar la reserva.\n\n📅 Decime la nueva fecha.";
    await setState(from, "MODIFY_DATE");
  }

  else if (lower === "2") {
    reply = "Perfecto 🙌 Gracias por elegirnos. ¡Te esperamos!";
    await setTemp(from, {});
    await setState(from, "MENU");
  }

  else {
    reply =
      "1️⃣ Modificar esta reserva 🔄\n" +
      "2️⃣ Finalizar";
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