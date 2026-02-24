import { supabase } from "@/lib/supabaseClient";
import { getSession, setState, setDNI, setTemp } from "@/lib/conversation";
import { createReservation } from "@/lib/createReservation";

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

    console.log("📩", text, "De:", from);

    const session = await getSession(from);
    let reply = "No entendí el mensaje 🤔";

    // =========================
    // NUEVO USUARIO
    // =========================
    if (!session.dni) {
      if (!/^\d{7,8}$/.test(text)) {
        reply =
          "👋 Hola, para comenzar necesito tu DNI (7 u 8 números).";
      } else {
        await setDNI(from, text);

        const { data: cliente } = await supabase
          .from("clients")
          .select("*")
          .eq("dni", text)
          .maybeSingle();

        if (cliente) {
          reply =
            `Hola ${cliente.name} 😊\n` +
            `¿Querés hacer una nueva reserva? (si/no)`;
          await setState(from, "IDLE");
        } else {
          reply = "No estás registrado. Decime tu nombre completo.";
          await setState(from, "REGISTER_NAME");
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

      reply =
        `Perfecto ${text} 🎉 Ya estás registrado.\n` +
        `¿Querés hacer una reserva? (si/no)`;

      await setState(from, "IDLE");
    }

    // =========================
    // IDLE
    // =========================
    else if (session.state === "IDLE") {

      if (lower === "si" || lower === "sí") {
        reply = "📅 ¿Para qué fecha querés venir? (ej: 12/03)";
        await setState(from, "ASK_DATE");
      }

      else if (lower === "no") {
        reply = "Perfecto 👍 Cuando quieras hacer una reserva escribime 😊";
      }

      else {
        reply = "¿Querés hacer una reserva? Respondé 'si' o 'no' 😊";
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
    // CONFIRMAR RESERVA
    // =========================
else if (session.state === "CONFIRM_RESERVATION") {

  if (lower === "si" || lower === "sí") {

    const temp = session.temp_data;

    const result = await createReservation({
      dni: session.dni,
      date: temp.date,
      time: temp.time,
      people: temp.people,
      notes: "",
    });

    if (!result.success) {
      reply = "Hubo un problema creando la reserva. Intentemos nuevamente.";
    } else {
      reply =
        `🎉 ¡Reserva confirmada!\n\n` +
        `📅 ${temp.date}\n` +
        `⏰ ${temp.time}\n` +
        `👥 ${temp.people} personas\n\n` +
        `🔐 Código: ${result.reservation.reservation_code}\n\n` +
        `Te esperamos 😊`;
    }

    await setTemp(from, {});
    await setState(from, "IDLE");

  } else if (lower === "no") {

    reply = "Perfecto 👍 Cancelamos esta solicitud.";
    await setTemp(from, {});
    await setState(from, "IDLE");

  } else {
    reply = "Solo necesito que confirmes con 'si' o 'no' 😊";
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