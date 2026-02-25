import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
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
    // SI NO TIENE DNI → PEDIR
    // =========================
    if (!session.dni) {
      if (!/^\d{7,8}$/.test(text)) {
        reply = "👋 Hola, para comenzar necesito tu DNI (7 u 8 números).";
      } else {
        await setDNI(from, text);

        const { data: cliente } = await supabase
          .from("clients")
          .select("*")
          .eq("dni", text)
          .maybeSingle();

       if (cliente) {

  if (!cliente.email) {
    reply = `Hola ${cliente.name} 😊 Antes de continuar necesito tu email para enviarte la confirmación de la reserva.`;
    await setState(from, "ASK_EMAIL");
  } else {
    reply =
      `Hola ${cliente.name} 😊\n\n` +
      `¿Qué querés hacer?\n` +
      `1️⃣ Hacer una reserva\n` +
      `2️⃣ Modificar una reserva existente`;
    await setState(from, "IDLE");
  }
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

      reply = `Perfecto ${text} 🎉 Ya estás registrado. ¿Qué querés hacer?`;
      await setState(from, "IDLE");
    }

  else if (session.state === "ASK_EMAIL") {

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(text)) {
    reply = "Ese email no parece válido 🤔 ¿Podés escribirlo nuevamente?";
  } else {

    await supabase
      .from("clients")
      .update({ email: text })
      .eq("dni", session.dni);

    reply =
      `Perfecto 👍 Ya tengo tu email.\n\n` +
      `¿Qué querés hacer?\n` +
      `1️⃣ Hacer una reserva\n` +
      `2️⃣ Modificar una reserva existente`;

    await setState(from, "IDLE");
  }
}

    // =========================
    // ESTADO LIBRE → IA
    // =========================
    else if (session.state === "IDLE") {

  // 👇 Primero detectar opción numérica
  if (lower === "1") {
    reply = "📅 ¿Para qué fecha querés venir? (ej: 12/03)";
    await setState(from, "ASK_DATE");
  }

  else if (lower === "2") {
    reply = "🔐 Pasame el código de reserva que querés modificar.";
    await setState(from, "ASK_MODIFY_CODE");
  }

  else {

    // 👇 Si no es número, usar IA
    const ai = await interpretMessage(text);

    if (ai.intent === "create_reservation") {
      reply = "📅 ¿Para qué fecha querés venir? (ej: 12/03)";
      await setState(from, "ASK_DATE");
    }

    else if (ai.intent === "modify_reservation") {
      reply = "🔐 Pasame el código de reserva que querés modificar.";
      await setState(from, "ASK_MODIFY_CODE");
    }

    else if (ai.intent === "greeting") {
      reply =
        `¿Qué querés hacer?\n\n` +
        `1️⃣ Hacer una reserva\n` +
        `2️⃣ Modificar una reserva existente`;
    }

    else {
      reply =
        `No entendí bien 🤔\n\n` +
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

      await setTemp(from, {
        ...(session.temp_data || {}),
        date: formattedDate,
      });

      reply = "⏰ ¿A qué hora?";
      await setState(from, "ASK_TIME");
    }

    // =========================
    // PEDIR HORA
    // =========================
    else if (session.state === "ASK_TIME") {

      await setTemp(from, {
        ...(session.temp_data || {}),
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
        ...(session.temp_data || {}),
        people,
      });

      const temp = {
        ...(session.temp_data || {}),
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