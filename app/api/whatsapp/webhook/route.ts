import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp, clearTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { interpretMessage } from "@/lib/ai";
import { hotelFlow } from "@/lib/hotel/hotelFlow";
import { NextResponse } from "next/server";


console.log("🔥🔥🔥 ESTE ES EL WEBHOOK NUEVO 🔥🔥🔥");



function getMenu() {
  return (
    "¿Qué querés hacer ahora?\n\n" +
    "1️⃣ Ver la carta 📖\n" +
    "2️⃣ Agregar una nota ✍️\n" +
    "3️⃣ Modificar esta reserva 🔄\n" +
    "4️⃣ Finalizar"
  );
}


function getNowByTZ(timezone: string) {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: timezone })
  );
}

function getTodayISO(timezone: string) {
  const now = getNowByTZ(timezone);
  return now.toISOString().split("T")[0];
}

function getTomorrowISO(timezone: string) {
  const now = getNowByTZ(timezone);
  const t = new Date(now);
  t.setDate(now.getDate() + 1);
  return t.toISOString().split("T")[0];
}
function formatDateToISO(input: string) {
  const timezone = "America/Argentina/Buenos_Aires";
const today = getTodayISO(timezone);
  const currentYear = today.split("-")[0];

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
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }

  return input;
}

let lastReply = "";

async function sendReply(to: string, reply: string) {
  lastReply = reply;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: reply },
  };

  console.log("📤 ENVIANDO A WHATSAPP:", JSON.stringify(payload, null, 2));

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.text(); // 👈 IMPORTANTE para debug

  console.log("📥 RESPUESTA WHATSAPP:", data);
}
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("business_id");
    const date = searchParams.get("date");
    const shift = searchParams.get("shift");

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "business_id requerido" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("appointments")
      .select(`
        id, reservation_code, client_dni, date, time,
        start_time, end_time, people, assigned_table_capacity,
        tables_used, notes, status, created_at,
        clients!appointments_client_dni_fkey ( dni, name, phone, email )
      `)
      .eq("business_id", businessId)
      .eq("status", "confirmed");

    // 🔥 Filtro por fecha exacta
    if (date) {
      query = query.eq("date", date);
    }

    // 🔥 Filtro por turno (robusto a acentos)
    if (shift) {
      const normalized = shift
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      if (normalized === "dia") {
        // Día: 12:00 a 16:59
        query = query.gte("time", "12:00:00").lt("time", "17:00:00");
      } else if (normalized === "noche") {
        // Noche: 17:00 a 23:59
        query = query.gte("time", "17:00:00").lte("time", "23:59:59");
      }
    }

    const { data, error } = await query
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      appointments: data ?? [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {

  console.log("📩 WEBHOOK HIT");

  try {

    const raw = await req.text();
    if (process.env.NODE_ENV !== "production") {
  console.log("📩 RAW:", raw);
}

    let body;

    try {
      body = JSON.parse(raw);
    } catch (err) {
      console.error("❌ ERROR PARSE JSON:", err);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    console.log("📩 BODY PARSED:", JSON.stringify(body, null, 2));

    const value = body?.entry?.[0]?.changes?.[0]?.value;

    if (!value) {
      console.log("⚠️ Sin value");
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    if (!value.messages || value.messages.length === 0) {
      console.log("⚠️ Evento sin mensaje (status/update)");
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

   const message = value.messages[0];

// 🔒 validar ID
if (!message?.id) {
  console.log("⚠️ Mensaje sin ID");
  return new Response("EVENT_RECEIVED", { status: 200 });
}

const messageId = message.id;

// 🔒 anti duplicado DB
const { data: exists } = await supabase
  .from("processed_messages")
  .select("id")
  .eq("id", messageId)
  .maybeSingle();

if (exists) {
  console.log("⚠️ Duplicado:", messageId);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// guardar procesado
await supabase.from("processed_messages").insert({
  id: messageId,
});

console.log("✅ Mensaje nuevo:", messageId);

// 🔒 validar FROM
if (!message.from) {
  console.log("⚠️ Sin FROM");
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// 🔒 validar tipo
if (message.type !== "text") {
  console.log("⚠️ No es texto:", message.type);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// datos
const from = message.from;
const text = message.text.body.trim();
const lower = text.toLowerCase();
const msg = lower.trim();

// =====================================
// 🚩 BOTÓN DE PÁNICO: CANCELAR O REINICIAR
// =====================================
if (msg === "cancelar" || msg === "inicio" || msg === "hola") {
  await clearTemp(from);
  await setState(from, "INIT");
  if (msg === "cancelar") {
    await sendReply(from, "Reserva cancelada. Volvemos al inicio. ¿En qué puedo ayudarte?");
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}

    const session = await getSession(from);

    console.log(
      `INCOMING → "${text}" | STATE: ${session.state} | TEMP:`,
      JSON.stringify(session.temp_data)
    );

    let reply = "";

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("phone_number_id", process.env.WHATSAPP_PHONE_NUMBER_ID)
      .single();

    if (!restaurant) {
      console.error("❌ Restaurante no encontrado");
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    const businessId = restaurant.id;

    // =====================================
    // 1. RECORDATORIO / CONFIRMACIÓN EXTERNA
    // =====================================
    if (session.state === "AWAITING_CONFIRMATION") {

  const reservationId = session.temp_data?.reservation_id;

  if (!reservationId) {
    reply = "⚠️ No encontré tu reserva. Probá reservar nuevamente.";
    await setState(from, "INIT");
    await clearTemp(from);
   sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
  }

  // 🔥 TRAER RESERVA ACTUAL
  const { data: reservation } = await supabase
    .from("appointments")
    .select("status, responded_at")
    .eq("id", reservationId)
    .single();

  // 🔥 ANTI LOOP
  if (reservation?.responded_at) {
    console.log("⛔ YA RESPONDIDA - IGNORANDO");
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("si")) {

    await supabase
      .from("appointments")
      .update({
        status: "confirmed",
        responded_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    reply = "✅ ¡Reserva confirmada! Te esperamos 🙌";

  } 
  else if (normalized.includes("cancel")) {

    await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        responded_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    reply = "❌ Tu reserva fue cancelada correctamente.";

  } 
  else {
    reply = "Respondé *SI* para confirmar 👍 o *CANCELAR* ❌";
   sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
  }

  // 🔥 LIMPIAR TODO
  await setState(from, "INIT");
  await clearTemp(from);

  sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
}
    // =====================================
    // 2. CONFIRM_RESERVATION (ROBUSTO)
    // =====================================
    if (session.state === "CONFIRM_RESERVATION") {
      console.log("👉 ENTRANDO A CONFIRM_RESERVATION - TEMP:", JSON.stringify(session.temp_data));

      let temp = { ...(session.temp_data || {}) };
      const isYes = lower === "si" || lower === "sí" || lower.includes("si") || lower.includes("dale") || lower.includes("ok");

      if (!isYes) {
        reply = "Respondé *SI* para confirmar 👍 o *CANCELAR* ❌";
       sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      }

      // ==================== MODIFICACIÓN ====================
      if (temp.is_modifying === true && temp.reservation_id) {
        console.log("→ Camino de MODIFICACIÓN (usando reservation_id)");

        // Recuperar datos si faltan
        if (!temp.date || !temp.people) {
          const { data: current } = await supabase
            .from("appointments")
            .select("date, people")
            .eq("id", temp.reservation_id)
            .single();

          if (current) {
            temp.date = temp.date || current.date;
            temp.people = temp.people || current.people;
          }
        }

        if (!temp.date || !temp.time || !temp.people) {
          reply = "Error: Faltan datos de la reserva. Intentá nuevamente.";
          await setState(from, "POST_RESERVATION_MENU");
       sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
        }

        const formattedStart = temp.time.includes(":") ? temp.time : `${temp.time}:00`;
        const startDateTime = new Date(`${temp.date}T${formattedStart}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 90 * 60000);

//--------------------------------------------------------------------------------------------------        

       console.log("→ MODIFICACIÓN REAL");

const result = await createReservation({
  business_id: businessId,
  dni: temp.dni!,
  date: temp.date!,
  time: temp.time!,
  people: Number(temp.people!),
});

if (!result.success) {
  reply = `❌ ${result.message}

${getMenu()}`;

  await setState(from, "POST_RESERVATION_MENU");
       sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
}

// 🔥 SI FUNCIONÓ → BORRAR LA ANTERIOR
await supabase
  .from("appointments")
  .delete()
  .eq("id", temp.reservation_id);

// actualizar temp
await setTemp(from, {
  reservation_code: result.reservation.reservation_code,
  reservation_id: result.reservation.id,
  is_modifying: false,
});

reply = `✅ Reserva modificada correctamente

📅 ${result.reservation.date}
⏰ ${result.reservation.time}
👥 ${result.reservation.people}

${getMenu()}`;

await setState(from, "POST_RESERVATION_MENU");
       sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
       
      }

// ==================== CREACIÓN NUEVA ====================

console.log("→ Camino de CREACIÓN NUEVA");

const result = await createReservation({
  business_id: businessId,
  dni: temp.dni!,
  date: temp.date!,
  time: temp.time!,
  people: Number(temp.people!),
});

if (!result.success) {

  // 🔥 limpiar estado SIEMPRE
  await setTemp(from, {
    ...temp,
    is_modifying: false,
    reservation_id: null
  });

  if (result.type === "ALTERNATIVES") {

    await setTemp(from, { 
      ...temp, 
      alternatives: result.alternatives 
    });

    await setState(from, "NO_MORE_SLOTS");
    
    const botones = result.alternatives && result.alternatives.length > 0
      ? result.alternatives.map((t: string, i: number) => `${i + 1}️⃣ ${t}`).join("\n")
      : "No hay más turnos hoy.";

    reply = `❌ *${result.message}*\n\n` +
            `Pero tengo estos horarios disponibles:\n` +
            `${botones}\n` +
            `4️⃣ Elegir otro día 📅\n` +
            `5️⃣ Finalizar`;

  } else {

    await setState(from, "POST_RESERVATION_MENU");

    reply = `❌ ${result.message}

${getMenu()}`;
  }

} else {

  const reservation = result.reservation;

  await setTemp(from, {
    reservation_code: reservation.reservation_code,
    reservation_id: reservation.id,
    is_modifying: false,
  });

  await setState(from, "POST_RESERVATION_MENU");

  reply = `🎉 ¡Reserva confirmada!\n\n` +
          `📅 *Día:* ${reservation.date}\n` +
          `⏰ *Hora:* ${reservation.time}\n` +
          `👥 *Personas:* ${reservation.people}\n` +
          `🔑 *Código:* ${reservation.reservation_code}\n\n` + 
          getMenu();
}

       sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
    }
    // =====================================
    // 3. MENÚ POST RESERVA - PRESERVA ID
    // =====================================
    else if (session.state === "POST_RESERVATION_MENU") {
      const msg = lower;

      if (msg.includes("carta") || msg.includes("menu") || msg === "1") {
        reply = "📖 Acá tenés la carta:\nhttps://queresto.com/GARIFO\n\n" + getMenu();
      } 
      else if (msg.includes("nota") || msg.includes("agregar") || msg === "2") {
        reply = "✍️ Dale, decime qué nota querés agregar.";
        await setState(from, "ADD_NOTE");
      } 
      else if (msg.includes("modificar") || msg.includes("cambiar") || msg === "3") {

  if (!session.temp_data?.reservation_id) {

  reply = `⚠️ No hay una reserva para modificar.

¿Qué querés hacer?

1️⃣ Crear nueva reserva  
2️⃣ Finalizar`;

  await setState(from, "NO_RESERVATION_MENU");

       sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
}

  reply = "¿Qué te gustaría cambiar? (fecha, hora o personas)";

  await setTemp(from, {
    ...(session.temp_data || {}),
    is_modifying: true,
    reservation_id: session.temp_data.reservation_id
  });

  await setState(from, "MODIFY_RESERVATION");
}
      else if (msg.includes("listo") || msg.includes("finalizar") || msg === "4") {
        reply = "Perfecto 👍 Gracias por tu reserva. ¡Te esperamos!";
        await setState(from, "INIT");
        await clearTemp(from);
      } 
      else {
        reply = "Perdón 😅 no te entendí.\n\n" + getMenu();
      }

       sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
    }

    // =====================================
    // 4. FLUJOS DE MODIFICACIÓN
    // =====================================
    else if (session.state === "MODIFY_RESERVATION") {
      const msg = lower.trim();
      if (msg.includes("fecha")) {
        reply = "📅 Decime la nueva fecha (ej: 25/04)";
        await setState(from, "MODIFY_DATE");
      } else if (msg.includes("hora")) {
        reply = "⏰ Decime la nueva hora";
        await setState(from, "MODIFY_TIME");
      } else if (msg.includes("persona") || msg.includes("gente")) {
        reply = "👥 ¿Cuántas personas ahora?";
        await setState(from, "MODIFY_PEOPLE");
      } else {
        reply = "No entendí 🤔\n\nPodés escribir:\n👉 fecha\n👉 hora\n👉 personas";
      }
        sendReply(from, reply).catch(console.error);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    else if (session.state === "MODIFY_TIME") {
      let input = String(text || "").trim().toLowerCase();
      let newTime: string | null = null;

      if (/^\d{1,2}$/.test(input)) {
        let hour = parseInt(input);
        if (hour >= 0 && hour <= 6) newTime = `${hour.toString().padStart(2, "0")}:00`;
        else if (hour >= 7 && hour <= 11) newTime = `${(hour + 12)}:00`;
        else newTime = `${hour.toString().padStart(2, "0")}:00`;
      } else if (/^\d{1,2}:\d{2}$/.test(input)) {
        newTime = input.length === 4 ? "0" + input : input;
      }

      if (!newTime) {
        await sendReply(from, "Decime la hora 🙂 (ej: 20, 20:30, 22, etc)");
        return new Response("EVENT_RECEIVED", { status: 200 });
      }

      await setTemp(from, { ...(session.temp_data || {}), time: newTime });
      await setState(from, "CONFIRM_RESERVATION");

      await sendReply(from, `Perfecto 👍 nueva hora: ${newTime}\n\n¿Confirmamos la reserva? (si/no)`);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    else if (session.state === "MODIFY_DATE") {
      const newDate = formatDateToISO(text);
      const reservationId = session.temp_data?.reservation_id;

      if (!reservationId) {
        reply = "No encontré la reserva 😕";
        await setState(from, "POST_RESERVATION_MENU");
        sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      }

      const { error } = await supabase
        .from("appointments")
        .update({ date: newDate })
        .eq("id", reservationId);

      reply = error 
        ? "Error al modificar la fecha 😕" 
        : `✅ Fecha actualizada a ${newDate}\n\n` + getMenu();

      await setState(from, "POST_RESERVATION_MENU");
     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      
    }

    else if (session.state === "MODIFY_PEOPLE") {
      const people = parseInt(text);
      const reservationId = session.temp_data?.reservation_id;

      if (isNaN(people) || people <= 0) {
        reply = "Cantidad inválida 😕";
        sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      }

      if (!reservationId) {
        reply = "No encontré la reserva 😕";
        await setState(from, "POST_RESERVATION_MENU");
        sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      }

      const { error } = await supabase
        .from("appointments")
        .update({ people })
        .eq("id", reservationId);

      reply = error 
        ? "Error al modificar 😕" 
        : `✅ Personas actualizadas a ${people}\n\n` + getMenu();

      await setState(from, "POST_RESERVATION_MENU");
     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      
    }

    // =====================================
    // ADD_NOTE
    // =====================================
    else if (session.state === "ADD_NOTE") {
      const reservationCode = session.temp_data?.reservation_code || session.temp_data?.last_reservation_code;

      if (!reservationCode) {
        console.error("❌ No hay reservation_code para nota. TEMP:", JSON.stringify(session.temp_data));
        reply = "No encontré la reserva. Consultala primero con el código.";
        await setState(from, "INIT");
      } else {
        const { error } = await supabase
          .from("appointments")
          .update({ notes: text })
          .eq("reservation_code", reservationCode);

        reply = error 
          ? "Error al guardar la nota 😕" 
          : "✅ Nota agregada correctamente.\n\n" + getMenu();
      }

      await setState(from, "POST_RESERVATION_MENU");
     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      
    }

    // =====================================
    // 5. IA + FLUJO INICIAL
    // =====================================
    let ai: any = null;
    try {
      ai = await interpretMessage(text);
      console.log("AI:", ai);
    } catch (e) {
      console.error("IA error");
    }

    if (ai && (!session.state || ["INIT", "NEW_USER"].includes(session.state))) {
      await setState(from, "INIT");
      await clearTemp(from);

      if (ai.intent === "greeting") {
        reply = "Hola 😊 Bienvenido. ¿Querés hacer una reserva o consultar una existente?";
      } else if (ai.intent === "create_reservation") {
        await setTemp(from, {
          date: ai.date,
          time: ai.time,
          people: ai.people,
          is_modifying: false,
          reservation_id: null
        });

        if (!ai.date) {
          reply = "📅 ¿Para qué día querés la reserva?";
          await setState(from, "ASK_DATE");
        } else if (!ai.time) {
          reply = "⏰ ¿A qué hora?";
          await setState(from, "ASK_TIME");
        } else if (!ai.people) {
          reply = "👥 ¿Para cuántas personas?";
          await setState(from, "ASK_PEOPLE");
        } else {
          reply = "Perfecto 👍 Solo necesito tu DNI.";
          await setState(from, "ASK_DNI");
        }
      } else if (ai.intent === "consult_reservation" || lower.includes("consultar") || lower.includes("codigo") || lower.includes("reserva")) {
        reply = "🔐 Pasame el código de tu reserva (ej: RC-001-26-0413-0004)";
        await setState(from, "ASK_CODE");
      } else if (ai.intent === "modify_reservation" || lower.includes("modificar")) {
        reply = "🔄 Para modificar una reserva primero necesito el código.\n\nPasame el código de reserva:";
        await setState(from, "ASK_CODE");
        await setTemp(from, { is_modifying: true });
      } else {
        reply = "Hola 😊 ¿Querés hacer una reserva nueva, consultar una existente o modificar una?";
      }

     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      
    }

    // =====================================
    // 6. FLUJOS ASK_*
    // =====================================
    else if (session.state === "ASK_DATE") {
      const date = formatDateToISO(text);
      await setTemp(from, { ...(session.temp_data || {}), date });
      reply = "⏰ ¿A qué hora?";
      await setState(from, "ASK_TIME");
    }

    else if (session.state === "ASK_TIME") {
      if (text.includes("/") || text.includes("-")) {
        const date = formatDateToISO(text);
        await setTemp(from, { ...(session.temp_data || {}), date });
        reply = "Perfecto 👍 ¿A qué hora?";
        await setState(from, "ASK_TIME");
      } else {
        let time = text.trim();
        if (!time.includes(":")) {
          if (/^\d{1,2}$/.test(time)) time = `${time}:00`;
          else {
            reply = "Hora inválida 😕 Ej: 21 o 21:00";
     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
          }
        }
        await setTemp(from, { ...(session.temp_data || {}), time });
        reply = "👥 ¿Para cuántas personas?";
        await setState(from, "ASK_PEOPLE");
      }
    }

    else if (session.state === "ASK_PEOPLE") {
      const people = parseInt(text);
      await setTemp(from, { ...(session.temp_data || {}), people });
      reply = "Perfecto 👍 Ahora necesito tu DNI.";
      await setState(from, "ASK_DNI");
    }

    else if (session.state === "ASK_DNI") {
      if (!/^\d{7,8}$/.test(text)) {
        reply = "El DNI debe tener 7 u 8 números.";
     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
      }

      await setDNI(from, text);
      await setTemp(from, { ...(session.temp_data || {}), dni: text });

      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("dni", text)
        .maybeSingle();

      if (!client) {
        await supabase.from("clients").insert({ dni: text, phone: from, business_id: businessId });
        reply = "Perfecto 👍 ¿Cómo es tu nombre completo?";
        await setState(from, "REGISTER_NAME");
      } else {
        reply = `Perfecto ${client.name || ""} 👍 ¿Confirmamos la reserva? (si/no)`;
        await setState(from, "CONFIRM_RESERVATION");
      }
    }

    else if (session.state === "REGISTER_NAME") {
      await supabase.from("clients").upsert({
        dni: session.temp_data?.dni,
        name: text,
        business_id: businessId,
      });
      reply = "Perfecto 🎉 Ahora tu email.";
      await setState(from, "ASK_EMAIL");
    }

    else if (session.state === "ASK_EMAIL") {
      await supabase.from("clients").update({ email: text }).eq("dni", session.temp_data?.dni);
      reply = "🎂 Tu fecha de cumpleaños (ej: 15/08)";
      await setState(from, "ASK_BIRTHDAY");
    }

    else if (session.state === "ASK_BIRTHDAY") {
      const birthday = formatDateToISO(text);
      await supabase.from("clients").update({ birthday }).eq("dni", session.temp_data?.dni);
      reply = "Listo 🙌 ¿Confirmamos la reserva? (si/no)";
      await setState(from, "CONFIRM_RESERVATION");
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
          reservation_id: data.id,
          last_reservation_code: data.reservation_code
        });
        reply = `📅 ${data.date}\n⏰ ${data.time}\n👥 ${data.people}\n\n` + getMenu();
        await setState(from, "POST_RESERVATION_MENU");
      }
    }

   else if (session.state === "NO_MORE_SLOTS") {
      const msg = lower.trim();
      const alternatives = session.temp_data?.alternatives || [];
      
      // Si el usuario elige 1, 2 o 3 (los horarios sugeridos)
      if (["1", "2", "3"].includes(msg) && alternatives.length >= parseInt(msg)) {
        const selectedTime = alternatives[parseInt(msg) - 1];
        
        // Actualizamos la hora en el temp y lo mandamos a confirmar de nuevo
        await setTemp(from, { ...session.temp_data, time: selectedTime });
        await setState(from, "CONFIRM_RESERVATION");
        
        reply = `Entendido, probemos a las *${selectedTime}*.\n\n¿Confirmamos la reserva? (si/no)`;
      } 
      else if (msg === "4" || msg.includes("día") || msg.includes("dia")) {
        reply = "📅 Decime para qué día querés la reserva";
        await setState(from, "ASK_DATE");
      } 
      else if (msg === "5" || msg.includes("finalizar")) {
        reply = "Perfecto 👍 Gracias por contactarnos. ¡Te esperamos pronto!";
        await setState(from, "INIT");
        await clearTemp(from);
      } 
      else {
        reply = "Por favor, elegí una de las opciones del menú (1 al 5).";
      }

     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
    }

    //-------------------------------------------------------------------------------------------------
    
    else if (session.state === "NO_RESERVATION_MENU") {
  const msg = lower.trim();

  if (msg === "1" || msg.includes("crear")) {

    await clearTemp(from);

    reply = "Perfecto 👍 ¿Para qué día querés la reserva?";
    await setState(from, "ASK_DATE");

  } 
  else if (msg === "2" || msg.includes("finalizar")) {

    reply = "Perfecto 👍 Gracias por contactarnos. ¡Te esperamos!";
    await setState(from, "INIT");
    await clearTemp(from);

  } 
  else {
    reply = "Elegí una opción:\n\n1️⃣ Crear nueva reserva\n2️⃣ Finalizar";
  }

     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });
}

    

    // =====================================
    // FALLBACK
    // =====================================
    if (!reply) {
  reply = "No entendí 😕";
}

     sendReply(from, reply).catch(console.error);
return new Response("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ ERROR GENERAL:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

}


