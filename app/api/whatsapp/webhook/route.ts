import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { interpretMessage } from "@/lib/ai";
import { hotelFlow } from "@/lib/hotel/hotelFlow"



// ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â¡ PEGÃƒÆ’Ã‚Â ESTO ACÃƒÆ’Ã‚Â
function getMenu() {
  return (
    "Ãƒâ€šÃ‚Â¿QuÃƒÆ’Ã‚Â© querÃƒÆ’Ã‚Â©s hacer ahora?\n\n" +
    "1ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ Ver la carta ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬â€œ\n" +
    "2ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ Agregar una nota ÃƒÂ¢Ã…â€œÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â\n" +
    "3ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ Modificar esta reserva ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾\n" +
    "4ÃƒÂ¯Ã‚Â¸Ã‚ÂÃƒÂ¢Ã†â€™Ã‚Â£ Finalizar"
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
    const body = await req.json()

    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

    if (!message || message.type !== "text") {
      return new Response("EVENT_RECEIVED", { status: 200 })
    }

    const incomingText = message.text.body.toLowerCase()

    // ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¨ HOTEL FLOW (NO TOCA RESTAURANT)
    if (incomingText.includes("hotel")) {
      console.log("ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¨ ENTRANDO A HOTEL FLOW")

      await hotelFlow(body)

      return new Response("EVENT_RECEIVED", { status: 200 })
    }

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° ACÃƒÆ’Ã‚Â SIGUE TODO TU RESTAURANT (NO LO TOQUES)

    const from = message.from;
    const text = message.text.body.trim();
    const lower = text.toLowerCase();

    const session = await getSession(from);

    const { data: restaurant, error: restaurantError } = await supabase
  .from("restaurants")
  .select("id")
  .eq("phone_number_id", process.env.WHATSAPP_PHONE_NUMBER_ID)
  .single();

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â´ VALIDAR PRIMERO
if (!restaurant || restaurantError) {
  console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ Restaurante no encontrado", restaurantError);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ RECIÃƒÆ’Ã¢â‚¬Â°N ACÃƒÆ’Ã‚Â LO USÃƒÆ’Ã‚ÂS
await supabase
  .from("conversation_state")
  .update({ restaurant_id: restaurant.id })
  .eq("phone", from);

    let reply = "No entendÃƒÆ’Ã‚Â­ ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬Â";

    // =====================================
// ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ IA SOLO EN ESTADOS INICIALES
// =====================================
let ai: any = null;

try {
  ai = await interpretMessage(text);
  console.log("AI:", ai);
  console.log("STATE:", session.state);
} catch {
  console.error("IA error");
}

// =========================
// ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ ELECCIÃƒÆ’Ã¢â‚¬Å“N DE HORARIO SUGERIDO
// =========================
if (session.state === "SUGGEST_ALTERNATIVES") {

  let time = text.trim();

  // normalizar
  if (!time.includes(":")) {
    if (/^\d{1,2}$/.test(time)) {
      time = `${time}:00`;
    } else {
      reply = "ElegÃƒÆ’Ã‚Â­ un horario vÃƒÆ’Ã‚Â¡lido ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢ Ej: 21:30";
      await sendReply(from, reply);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  const temp = session.temp_data;

  const result = await createReservation({
    restaurant_id: restaurant.id,
    dni: temp.dni,
    date: temp.date,
    time,
    people: temp.people,
  });

  if (!result.success) {
    reply = result.message;
    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
  await setTemp(from, {
    ...temp,
    time,
    reservation_code: result.reservation?.reservation_code,
  });

  reply =
    `Reserva confirmada.\n\n` +
    `Fecha: ${temp.date}\n` +
    `Hora: ${time}\n` +
    `Personas: ${temp.people}\n` +
    `Codigo: ${result.reservation?.reservation_code}\n\n` +
    `Gracias por tu reserva. Te esperamos.`;
  await setState(from, "INIT");
  await setState(from, "POST_RESERVATION_MENU");
await sendReply(from, reply);

  return new Response("EVENT_RECEIVED", { status: 200 });
}

    

    // =====================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ PRIORIDAD TOTAL: CONFIRMACIÃƒÆ’Ã¢â‚¬Å“N
// =====================================
if (session.state === "CONFIRM_RESERVATION") {
  console.log("ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° ENTRANDO A CONFIRM_RESERVATION");

  if (lower === "si" || lower === "sÃƒÆ’Ã‚Â­") {
    console.log("ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CONFIRMADO");

    const temp = session.temp_data;
    const finalDNI = temp?.dni;

    if (!finalDNI) {
      reply = "Error con el DNI. IntentÃƒÆ’Ã‚Â¡ nuevamente.";
      await setState(from, "ASK_DNI");
      await sendReply(from, reply);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ asegurar cliente
    const { error: clientError } = await supabase
      .from("clients")
      .upsert({
        dni: finalDNI,
        phone: from,
        restaurant_id: restaurant.id,
      });

    if (clientError) {
      console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ CLIENT ERROR:", clientError);
    }

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ crear reserva
    const result = await createReservation({
      restaurant_id: restaurant.id,
      dni: finalDNI,
      date: temp.date,
      time: temp.time,
      people: temp.people,
    });

    console.log("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ RESULT:", result);
if (!result.success) {

  if (result.message.includes("Tengo disponible")) {
    await setState(from, "SUGGEST_ALTERNATIVES");

    await setTemp(from, {
      ...session.temp_data,
      last_suggestions: result.message,
    });
  }

  reply = result.message;
  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

    await setTemp(from, {
      ...temp,
      reservation_code: result.reservation?.reservation_code,
    });

    reply =
      `Reserva confirmada.\n\n` +
      `Fecha: ${temp.date}\n` +
      `Hora: ${temp.time}\n` +
      `Personas: ${temp.people}\n` +
      `Codigo: ${result.reservation?.reservation_code}\n\n` +
      `Gracias por tu reserva. Te esperamos.`;

    await setState(from, "INIT");
    await sendReply(from, reply);

    return new Response("EVENT_RECEIVED", { status: 200 });

  } else {
    reply = "Perfecto ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â AvÃƒÆ’Ã‚Â­same si necesitÃƒÆ’Ã‚Â¡s algo.";
    await setState(from, "INIT");
    await sendReply(from, reply);

    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}
// =========================
// MENÃƒÆ’Ã…Â¡ POST RESERVA
// =========================
else if (session.state === "POST_RESERVATION_MENU") {

  const msg = text.toLowerCase();

  if (msg.includes("carta") || msg.includes("menu") || msg === "1") {
    reply =
      "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬â€œ AcÃƒÆ’Ã‚Â¡ tenÃƒÆ’Ã‚Â©s la carta:\nhttps://turestaurante.com/menu\n\n" +
      getMenu();
  }

  else if (
    msg.includes("nota") ||
    msg.includes("agregar") ||
    msg === "2"
  ) {
    reply = "ÃƒÂ¢Ã…â€œÃ‚ÂÃƒÂ¯Ã‚Â¸Ã‚Â Dale, decime quÃƒÆ’Ã‚Â© nota querÃƒÆ’Ã‚Â©s agregar.";
    await setState(from, "ADD_NOTE");
  }

  else if (
    msg.includes("modificar") ||
    msg.includes("cambiar") ||
    msg === "3"
  ) {
    reply = "ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Ãƒâ€šÃ‚Â¿QuÃƒÆ’Ã‚Â© te gustarÃƒÆ’Ã‚Â­a cambiar? (fecha, hora o personas)";
    await setState(from, "MODIFY_RESERVATION");
  }

  else if (
    msg.includes("listo") ||
    msg.includes("finalizar") ||
    msg === "4"
  ) {
    reply = "Perfecto ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â Gracias por tu reserva. Ãƒâ€šÃ‚Â¡Te esperamos!";
    await setState(from, "INIT");
  }

  else {
    reply =
      "PerdÃƒÆ’Ã‚Â³n ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¦ no te entendÃƒÆ’Ã‚Â­.\n\n" +
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
    reply = "No encontrÃƒÆ’Ã‚Â© la reserva.";
  } else {

    const { error } = await supabase
      .from("appointments")
      .update({ notes: text })
      .eq("reservation_code", reservationCode);

    if (error) {
      console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ ERROR NOTA:", error);
      reply = "Error al guardar la nota.";
    } else {
      reply = "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Nota agregada a tu reserva.\n\n" + getMenu();
    }
  }

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ CLAVE: volver al menÃƒÆ’Ã‚Âº
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
    reply = "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¦ Decime la nueva fecha (ej: 25/04)";
    await setState(from, "MODIFY_DATE");
  }

  else if (msg.includes("hora")) {
    reply = "ÃƒÂ¢Ã‚ÂÃ‚Â° Decime la nueva hora";
    await setState(from, "MODIFY_TIME");
  }

  else if (msg.includes("persona") || msg.includes("gente")) {
    reply = "ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥ Ãƒâ€šÃ‚Â¿CuÃƒÆ’Ã‚Â¡ntas personas ahora?";
    await setState(from, "MODIFY_PEOPLE");
  }

  else {
    reply =
      "No entendÃƒÆ’Ã‚Â­ ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬Â\n\n" +
      "PodÃƒÆ’Ã‚Â©s escribir:\n" +
      "ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° fecha\nÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° hora\nÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° personas";
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

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° validar formato
  if (!time.includes(":")) {
    if (/^\d{1,2}$/.test(time)) {
      time = `${time}:00`;
    } else {
      reply = "Hora invÃƒÆ’Ã‚Â¡lida ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢ Ej: 21 o 21:00";
      await sendReply(from, reply);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  const code = session.temp_data?.reservation_code;

  if (!code) {
    reply = "No encontrÃƒÆ’Ã‚Â© la reserva ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢";
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
    console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ ERROR MODIFY TIME:", error);
    reply = "Error al modificar la hora ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢";
  } else {
    reply =
      "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Hora actualizada correctamente\n\n" +
      getMenu();
  }

  await setState(from, "POST_RESERVATION_MENU");

  await sendReply(from, reply);

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ ESTO TE FALTABA EN ALGÃƒÆ’Ã…Â¡N CAMINO
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// =========================
// MODIFICAR DATE
// =========================

else if (session.state === "MODIFY_DATE") {

  const date = formatDateToISO(text);
  const code = session.temp_data?.reservation_code;

  if (!code) {
    reply = "No encontrÃƒÆ’Ã‚Â© la reserva ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢";
    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ date })
    .eq("reservation_code", code);

  if (error) {
    console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ ERROR MODIFY DATE:", error);
    reply = "Error al modificar la fecha ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢";
  } else {
    reply = "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Fecha actualizada\n\n" + getMenu();
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
    reply = "Cantidad invÃƒÆ’Ã‚Â¡lida ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢";
    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ people })
    .eq("reservation_code", code);

  if (error) {
    console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ ERROR MODIFY PEOPLE:", error);
    reply = "Error al modificar ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢";
  } else {
    reply = "ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Personas actualizadas\n\n" + getMenu();
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
    reply = "Hola ÃƒÂ°Ã…Â¸Ã‹Å“Ã…Â  Bienvenido. Ãƒâ€šÃ‚Â¿QuerÃƒÆ’Ã‚Â©s hacer una reserva o consultar una existente?";
  }

  else if (ai.intent === "create_reservation") {
    await setTemp(from, {
      date: ai.date,
      time: ai.time,
      people: ai.people,
    });

    if (!ai.date) {
      reply = "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¦ Ãƒâ€šÃ‚Â¿Para quÃƒÆ’Ã‚Â© dÃƒÆ’Ã‚Â­a querÃƒÆ’Ã‚Â©s la reserva?";
      await setState(from, "ASK_DATE");
    }
    else if (!ai.time) {
      reply = "ÃƒÂ¢Ã‚ÂÃ‚Â° Ãƒâ€šÃ‚Â¿A quÃƒÆ’Ã‚Â© hora?";
      await setState(from, "ASK_TIME");
    }
    else if (!ai.people) {
      reply = "ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥ Ãƒâ€šÃ‚Â¿Para cuÃƒÆ’Ã‚Â¡ntas personas?";
      await setState(from, "ASK_PEOPLE");
    }
    else {
      reply = "Perfecto ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â Solo necesito tu DNI.";
      await setState(from, "ASK_DNI");
    }
  }

  else if (ai.intent === "consult_reservation") {
    reply = "ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â Pasame el cÃƒÆ’Ã‚Â³digo de reserva.";
    await setState(from, "ASK_CODE");
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 }); // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ ESTO ES CLAVE
}

    // =====================================
// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â FLUJO NORMAL
// =====================================

if (session.state === "ASK_DATE") {
  const date = formatDateToISO(text);

  await setTemp(from, {
    ...session.temp_data,
    date,
  });

  reply = "ÃƒÂ¢Ã‚ÂÃ‚Â° Ãƒâ€šÃ‚Â¿A quÃƒÆ’Ã‚Â© hora?";
  await setState(from, "ASK_TIME");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_TIME") {

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° detectar si mandÃƒÆ’Ã‚Â³ fecha por error
  if (text.includes("/") || text.includes("-")) {

    const date = formatDateToISO(text);

    await setTemp(from, {
      ...session.temp_data,
      date,
    });

    reply = "Perfecto ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â Ãƒâ€šÃ‚Â¿A quÃƒÆ’Ã‚Â© hora?";
    await setState(from, "ASK_TIME");

    await sendReply(from, reply);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  // ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ¢â‚¬Â° normal (hora)
  let time = text.trim();

  if (!time.includes(":")) {
    if (/^\d{1,2}$/.test(time)) {
      time = `${time}:00`;
    } else {
      reply = "Hora invÃƒÆ’Ã‚Â¡lida ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢ Ej: 21 o 21:00";
      await sendReply(from, reply);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  await setTemp(from, {
    ...session.temp_data,
    time,
  });

  reply = "ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥ Ãƒâ€šÃ‚Â¿Para cuÃƒÆ’Ã‚Â¡ntas personas?";
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

  reply = "Perfecto ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â Ahora necesito tu DNI.";
  await setState(from, "ASK_DNI");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_DNI") {

  if (!/^\d{7,8}$/.test(text)) {
    reply = "El DNI debe tener 7 u 8 nÃƒÆ’Ã‚Âºmeros.";

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
      console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ ERROR INSERT DNI:", error);
    }

    reply = "Perfecto ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â Ãƒâ€šÃ‚Â¿CÃƒÆ’Ã‚Â³mo es tu nombre completo?";
    await setState(from, "REGISTER_NAME");

  } else {

    reply = `Perfecto ${client.name || ""} ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â Ãƒâ€šÃ‚Â¿Confirmamos la reserva? (si/no)`;
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

  reply = "Perfecto ÃƒÂ°Ã…Â¸Ã…Â½Ã¢â‚¬Â° Ahora tu email.";
  await setState(from, "ASK_EMAIL");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

else if (session.state === "ASK_EMAIL") {
  await supabase
    .from("clients")
    .update({ email: text })
    .eq("dni", session.temp_data?.dni);

  reply = "ÃƒÂ°Ã…Â¸Ã…Â½Ã¢â‚¬Å¡ Tu fecha de cumpleaÃƒÆ’Ã‚Â±os (ej: 15/08)";
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

  reply = "Listo ÃƒÂ°Ã…Â¸Ã¢â€žÂ¢Ã…â€™ Ãƒâ€šÃ‚Â¿Confirmamos la reserva? (si/no)";
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
    reply = "No encontrÃƒÆ’Ã‚Â© una reserva con ese cÃƒÆ’Ã‚Â³digo.";
  } else {

    await setTemp(from, {
      reservation_code: data.reservation_code,
    });

    reply =
      `ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¦ ${data.date}\n` +
      `ÃƒÂ¢Ã‚ÂÃ‚Â° ${data.time}\n` +
      `ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥ ${data.people}\n\n` +
      getMenu();

    await setState(from, "POST_RESERVATION_MENU");
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ FALLBACK FINAL (ACÃƒÆ’Ã‚Â VA)
reply = "No entendÃƒÆ’Ã‚Â­ ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Â¢";
await sendReply(from, reply);
return new Response("EVENT_RECEIVED", { status: 200 });

} catch (err) {
  console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ ERROR GENERAL:", err);
  return new Response("EVENT_RECEIVED", { status: 200 });
}
}
