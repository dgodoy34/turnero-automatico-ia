import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { interpretMessage } from "@/lib/ai";
import { hotelFlow } from "@/lib/hotel/hotelFlow"



// 👇 PEGÁ ESTO ACÁ
function getMenu() {
  return (
    "¿Qué querés hacer ahora?\n\n" +
    "1️⃣ Ver la carta 📖\n" +
    "2️⃣ Agregar una nota ✍️\n" +
    "3️⃣ Modificar esta reserva 🔄\n" +
    "4️⃣ Finalizar"
  );
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



async function sendReply(to: string, reply: string) {
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
        text: { body: reply },
      }),
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
const phoneId =
  body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id

// 👉 SI ES HOTEL → SALE POR ACÁ
if (phoneId === process.env.HOTEL_PHONE_ID) {
  await hotelFlow(body)
  return new Response("EVENT_RECEIVED", { status: 200 })
}

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    

    if (!message || message.type !== "text") {
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    const from = message.from;
    const text = message.text.body.trim();
    const lower = text.toLowerCase();

    const session = await getSession(from);

    const { data: restaurant, error: restaurantError } = await supabase
  .from("restaurants")
  .select("id")
  .eq("phone_number_id", process.env.WHATSAPP_PHONE_NUMBER_ID)
  .single();

// 🔴 VALIDAR PRIMERO
if (!restaurant || restaurantError) {
  console.error("❌ Restaurante no encontrado", restaurantError);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// ✅ RECIÉN ACÁ LO USÁS
await supabase
  .from("conversation_state")
  .update({ restaurant_id: restaurant.id })
  .eq("phone", from);

    let reply = "No entendí 🤔";

    // =====================================
// 🤖 IA SOLO EN ESTADOS INICIALES
// =====================================
let ai: any = null;

try {
  ai = await interpretMessage(text);
  console.log("AI:", ai);
  console.log("STATE:", session.state);
} catch {
  console.error("IA error");
}

    

    // =====================================
// 🔥 PRIORIDAD TOTAL: CONFIRMACIÓN
// =====================================
if (session.state === "CONFIRM_RESERVATION") {
  console.log("👉 ENTRANDO A CONFIRM_RESERVATION");

  if (lower === "si" || lower === "sí") {
    console.log("✅ CONFIRMADO");

    const temp = session.temp_data;
    const finalDNI = temp?.dni;

    if (!finalDNI) {
      reply = "Error con el DNI. Intentá nuevamente.";
      await setState(from, "ASK_DNI");
      await sendReply(from, reply);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    // ✅ asegurar cliente
    const { error: clientError } = await supabase
      .from("clients")
      .upsert({
        dni: finalDNI,
        phone: from,
        restaurant_id: restaurant.id,
      });

    if (clientError) {
      console.error("❌ CLIENT ERROR:", clientError);
    }

    // ✅ crear reserva
    const result = await createReservation({
      restaurant_id: restaurant.id,
      dni: finalDNI,
      date: temp.date,
      time: temp.time,
      people: temp.people,
    });

    console.log("📦 RESULT:", result);

    if (!result.success) {
      reply = result.message;
    } else {

      // 🔥 GUARDAR reservation_code (CLAVE PARA NOTAS)
      await setTemp(from, {
        reservation_code: result.reservation?.reservation_code,
      });

      reply =
        `🎉 *¡Reserva confirmada!*\n\n` +
        `📅 ${temp.date}\n` +
        `⏰ ${temp.time}\n` +
        `👥 ${temp.people}\n\n` +
        `🔐 Código: ${result.reservation?.reservation_code}\n\n` +
        getMenu();
    }

    await setState(from, "POST_RESERVATION_MENU");
    await sendReply(from, reply);

    return new Response("EVENT_RECEIVED", { status: 200 });

  } else {
    reply = "Perfecto 👍 Avísame si necesitás algo.";
    await setState(from, "INIT");
    await sendReply(from, reply);

    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}
// =========================
// MENÚ POST RESERVA
// =========================
else if (session.state === "POST_RESERVATION_MENU") {

  const msg = text.toLowerCase();

  if (msg.includes("carta") || msg.includes("menu") || msg === "1") {
    reply =
      "📖 Acá tenés la carta:\nhttps://turestaurante.com/menu\n\n" +
      getMenu();
  }

  else if (
    msg.includes("nota") ||
    msg.includes("agregar") ||
    msg === "2"
  ) {
    reply = "✍️ Dale, decime qué nota querés agregar.";
    await setState(from, "ADD_NOTE");
  }

  else if (
    msg.includes("modificar") ||
    msg.includes("cambiar") ||
    msg === "3"
  ) {
    reply = "🔄 ¿Qué te gustaría cambiar? (fecha, hora o personas)";
    await setState(from, "MODIFY_RESERVATION");
  }

  else if (
    msg.includes("listo") ||
    msg.includes("finalizar") ||
    msg === "4"
  ) {
    reply = "Perfecto 👍 Gracias por tu reserva. ¡Te esperamos!";
    await setState(from, "INIT");
  }

  else {
    reply =
      "Perdón 😅 no te entendí.\n\n" +
      getMenu();
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// =========================
// AGREGAR NOTA
// =========================
else if (session.state === "ADD_NOTE") {

  const reservationCode = session.temp_data?.reservation_code;

  if (!reservationCode) {
    reply = "No encontré la reserva.";
  } else {

    const { error } = await supabase
      .from("appointments")
      .update({ notes: text })
      .eq("reservation_code", reservationCode);

    if (error) {
      console.error("❌ ERROR NOTA:", error);
      reply = "Error al guardar la nota.";
    } else {
      reply = "✅ Nota agregada a tu reserva.\n\n" + getMenu();
    }
  }

  // 🔥 CLAVE: volver al menú
  await setState(from, "POST_RESERVATION_MENU");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}
// =========================
// MODIFICAR RESERVA
// =========================
else if (session.state === "MODIFY_RESERVATION") {

  const msg = text.toLowerCase().trim();

  if (msg.includes("fecha")) {
    reply = "📅 Decime la nueva fecha (ej: 25/04)";
    await setState(from, "MODIFY_DATE");
  }

  else if (msg.includes("hora")) {
    reply = "⏰ Decime la nueva hora";
    await setState(from, "MODIFY_TIME");
  }

  else if (msg.includes("persona") || msg.includes("gente")) {
    reply = "👥 ¿Cuántas personas ahora?";
    await setState(from, "MODIFY_PEOPLE");
  }

  else {
    reply =
      "No entendí 🤔\n\n" +
      "Podés escribir:\n" +
      "👉 fecha\n👉 hora\n👉 personas";
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// =========================
// MODIFICAR HORA
// =========================
// =========================
// MODIFICAR HORA (FIX REAL)
// =========================
else if (session.state === "MODIFY_TIME") {

  let time = text.trim();

  // 👉 validar formato
  if (!time.includes(":")) {
    if (/^\d{1,2}$/.test(time)) {
      time = `${time}:00`;
    } else {
      reply = "Hora inválida 😕 Ej: 21 o 21:00";
      await sendReply(from, reply);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  const code = session.temp_data?.reservation_code;

  if (!code) {
    reply = "No encontré la reserva 😕";
    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      time,
      start_time: `${time}:00`,
    })
    .eq("reservation_code", code);

  if (error) {
    console.error("❌ ERROR MODIFY TIME:", error);
    reply = "Error al modificar la hora 😕";
  } else {
    reply =
      "✅ Hora actualizada correctamente\n\n" +
      getMenu();
  }

  await setState(from, "POST_RESERVATION_MENU");

  await sendReply(from, reply);

  // 🔥 ESTO TE FALTABA EN ALGÚN CAMINO
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// =========================
// MODIFICAR DATE
// =========================

else if (session.state === "MODIFY_DATE") {

  const date = formatDateToISO(text);
  const code = session.temp_data?.reservation_code;

  if (!code) {
    reply = "No encontré la reserva 😕";
    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ date })
    .eq("reservation_code", code);

  if (error) {
    console.error("❌ ERROR MODIFY DATE:", error);
    reply = "Error al modificar la fecha 😕";
  } else {
    reply = "✅ Fecha actualizada\n\n" + getMenu();
  }

  await setState(from, "POST_RESERVATION_MENU");
  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// =========================
// MODIFICAR PEOPLE
// =========================

else if (session.state === "MODIFY_PEOPLE") {

  const people = parseInt(text);
  const code = session.temp_data?.reservation_code;

  if (isNaN(people) || people <= 0) {
    reply = "Cantidad inválida 😕";
    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ people })
    .eq("reservation_code", code);

  if (error) {
    console.error("❌ ERROR MODIFY PEOPLE:", error);
    reply = "Error al modificar 😕";
  } else {
    reply = "✅ Personas actualizadas\n\n" + getMenu();
  }

  await setState(from, "POST_RESERVATION_MENU");
  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

if (
  ai &&
  ["greeting", "create_reservation", "consult_reservation"].includes(ai.intent) &&
  ["INIT", "NEW_USER"].includes(session.state)
) {
  await setState(from, "INIT");

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
      reply = "Perfecto 👍 Solo necesito tu DNI.";
      await setState(from, "ASK_DNI");
    }
  }

  else if (ai.intent === "consult_reservation") {
    reply = "🔐 Pasame el código de reserva.";
    await setState(from, "ASK_CODE");
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 }); // 🔥 ESTO ES CLAVE
}

    // =====================================
// 🔁 FLUJO NORMAL
// =====================================

if (session.state === "ASK_DATE") {
  const date = formatDateToISO(text);

  await setTemp(from, {
    ...session.temp_data,
    date,
  });

  reply = "⏰ ¿A qué hora?";
  await setState(from, "ASK_TIME");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_TIME") {

  // 👉 detectar si mandó fecha por error
  if (text.includes("/") || text.includes("-")) {

    const date = formatDateToISO(text);

    await setTemp(from, {
      ...session.temp_data,
      date,
    });

    reply = "Perfecto 👍 ¿A qué hora?";
    await setState(from, "ASK_TIME");

    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  // 👉 normal (hora)
  let time = text.trim();

  if (!time.includes(":")) {
    if (/^\d{1,2}$/.test(time)) {
      time = `${time}:00`;
    } else {
      reply = "Hora inválida 😕 Ej: 21 o 21:00";
      await sendReply(from, reply);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  await setTemp(from, {
    ...session.temp_data,
    time,
  });

  reply = "👥 ¿Para cuántas personas?";
  await setState(from, "ASK_PEOPLE");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_PEOPLE") {
  const people = parseInt(text);

  await setTemp(from, {
    ...session.temp_data,
    people,
  });

  reply = "Perfecto 👍 Ahora necesito tu DNI.";
  await setState(from, "ASK_DNI");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_DNI") {

  if (!/^\d{7,8}$/.test(text)) {
    reply = "El DNI debe tener 7 u 8 números.";

    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  await setDNI(from, text);

  await setTemp(from, {
    ...session.temp_data,
    dni: text,
  });

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("dni", text)
    .maybeSingle();

  if (!client) {

    const { error } = await supabase.from("clients").insert({
      dni: text,
      phone: from,
      restaurant_id: restaurant.id,
    });

    if (error) {
      console.error("❌ ERROR INSERT DNI:", error);
    }

    reply = "Perfecto 👍 ¿Cómo es tu nombre completo?";
    await setState(from, "REGISTER_NAME");

  } else {

    reply = `Perfecto ${client.name || ""} 👍 ¿Confirmamos la reserva? (si/no)`;
    await setState(from, "CONFIRM_RESERVATION");
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "REGISTER_NAME") {
  await supabase.from("clients").upsert({
    dni: session.temp_data?.dni,
    name: text,
    restaurant_id: restaurant.id,
  });

  reply = "Perfecto 🎉 Ahora tu email.";
  await setState(from, "ASK_EMAIL");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_EMAIL") {
  await supabase
    .from("clients")
    .update({ email: text })
    .eq("dni", session.temp_data?.dni);

  reply = "🎂 Tu fecha de cumpleaños (ej: 15/08)";
  await setState(from, "ASK_BIRTHDAY");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_BIRTHDAY") {
  const birthday = formatDateToISO(text);

  await supabase
    .from("clients")
    .update({ birthday })
    .eq("dni", session.temp_data?.dni);

  reply = "Listo 🙌 ¿Confirmamos la reserva? (si/no)";
  await setState(from, "CONFIRM_RESERVATION");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_CODE") {

  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("reservation_code", text)
    .maybeSingle();

  if (!data) {
    reply = "No encontré una reserva con ese código.";
  } else {

    await setTemp(from, {
      reservation_code: data.reservation_code,
    });

    reply =
      `📅 ${data.date}\n` +
      `⏰ ${data.time}\n` +
      `👥 ${data.people}\n\n` +
      getMenu();

    await setState(from, "POST_RESERVATION_MENU");
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

  } catch (err) {
    console.error("❌ ERROR GENERAL:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }}