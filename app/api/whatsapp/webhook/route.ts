import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";
import { interpretMessage } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const change = body?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text")
      return new Response("EVENT_RECEIVED", { status: 200 });

    const from = message.from;
    const text = message.text.body.trim();

    console.log("📩", text, "De:", from);

    const session = await getSession(from);
    let reply = "No entendí el mensaje 🤔";

    // =========================
    // 1️⃣ NUEVO USUARIO
    // =========================
    if (session.state === "NEW_USER") {
      reply =
        "¡Hola! 👋 Soy el asistente de El Rincón Criollo.\nPara comenzar necesito tu DNI.";
      await setState(from, "WAITING_DNI");
    }

    // =========================
    // 2️⃣ ESPERANDO DNI
    // =========================
    else if (session.state === "WAITING_DNI") {
      if (!/^\d{7,8}$/.test(text)) {
        reply = "Por favor ingresá un DNI válido (7 u 8 números).";
      } else {
        await setDNI(from, text);

        const { data: cliente } = await supabase
          .from("clients")
          .select("*")
          .eq("dni", text)
          .maybeSingle();

        if (cliente) {
          reply = `Hola ${cliente.name} 😄 ¿Querés hacer una reserva o consultar una existente?`;
          await setState(from, "IDLE");
        } else {
          reply = "No estás registrado. Decime tu nombre completo.";
          await setState(from, "REGISTER_NAME");
        }
      }
    }

    // =========================
    // 3️⃣ REGISTRAR NOMBRE
    // =========================
    else if (session.state === "REGISTER_NAME") {
      const dni = session.dni;

      await supabase.from("clients").insert({
        dni,
        name: text,
        phone: from,
      });

      reply = `Perfecto ${text} 🎉 Ya estás registrado.\n¿Querés hacer una reserva?`;
      await setState(from, "IDLE");
    }

    // =========================
    // 4️⃣ CLIENTE IDENTIFICADO
    // =========================
    else if (session.state === "IDLE") {

  const lower = text.toLowerCase();

  // 🔥 Detectar afirmación simple
  if (lower === "si" || lower === "sí") {
    reply = "Perfecto 👍 ¿Para qué fecha querés venir?";
    await setState(from, "ASK_DATE");
  }

  else {
    const ai = await interpretMessage(text);
    console.log("🧠 AI:", ai);

    if (ai.intent === "create_reservation") {
      await setTemp(from, {
        ...(session.temp_data || {}),
        date: ai.date,
        time: ai.time,
        people: ai.people,
      });

      if (!ai.date) {
        reply = "¿Para qué fecha querés venir?";
        await setState(from, "ASK_DATE");
      } 
      else if (!ai.time) {
        reply = "¿A qué hora?";
        await setState(from, "ASK_TIME");
      } 
      else if (!ai.people) {
        reply = "¿Para cuántas personas?";
        await setState(from, "ASK_PEOPLE");
      } 
      else {
        reply = `Confirmo:\n📅 ${ai.date}\n⏰ ${ai.time}\n👥 ${ai.people}\n¿Confirmamos? (si/no)`;
        await setState(from, "CONFIRM_RESERVATION");
      }
    }

    else if (ai.intent === "menu") {
      reply = "Tenemos milanesa napolitana, asado criollo, locro los domingos y flan casero 😋";
    }

    else if (ai.intent === "greeting") {
      reply = "¡Hola! 😄 ¿Querés hacer una reserva o consultar una existente?";
    }

    else {
      reply = "No entendí bien 🤔 ¿Querés hacer una reserva?";
    }
  }
}
    // =========================
    // 5️⃣ PEDIR FECHA
    // =========================
    else if (session.state === "ASK_DATE") {
      await setTemp(from, {
        ...(session.temp_data || {}),
        date: text,
      });

      reply = "Perfecto 👍 ¿A qué hora?";
      await setState(from, "ASK_TIME");
    }

    // =========================
    // 6️⃣ PEDIR HORA
    // =========================
    else if (session.state === "ASK_TIME") {
      await setTemp(from, {
        ...(session.temp_data || {}),
        time: text,
      });

      reply = "¿Para cuántas personas?";
      await setState(from, "ASK_PEOPLE");
    }

    // =========================
    // 7️⃣ PEDIR PERSONAS
    // =========================
    else if (session.state === "ASK_PEOPLE") {
      await setTemp(from, {
        ...(session.temp_data || {}),
        people: parseInt(text),
      });

      const temp = {
        ...(session.temp_data || {}),
        people: parseInt(text),
      };

      reply =
        `Confirmo:\n📅 ${temp.date}\n⏰ ${temp.time}\n👥 ${temp.people}\n¿Confirmamos? (si/no)`;

      await setState(from, "CONFIRM_RESERVATION");
    }

    // =========================
    // 8️⃣ CONFIRMAR RESERVA
    // =========================
    else if (session.state === "CONFIRM_RESERVATION") {
      if (text.toLowerCase() === "si") {
        const temp = session.temp_data;

        const result = await createReservation({
          dni: session.dni,
          date: temp.date,
          time: temp.time,
          people: temp.people,
          notes: temp.notes || "",
        });

        if (!result.success) {
          reply =
            "Ya tenés una reserva confirmada en ese horario.\n¿Querés modificarla?";
        } else {
         reply =
  `🎉 ¡Reserva confirmada!\n\n` +
  `📅 ${temp.date}\n` +
  `⏰ ${temp.time}\n` +
  `👥 ${temp.people} personas\n\n` +
  `🔐 Código: ${result.reservation.reservation_code}\n\n` +
  `Te esperamos 😊\nSi necesitás modificarla, solo decime.`;

          await setTemp(from, {});
          await setState(from, "IDLE");
        }
      } else {
        reply = "Reserva cancelada. ¿Querés intentar nuevamente?";
        await setState(from, "IDLE");
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