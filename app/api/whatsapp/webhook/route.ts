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
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    const from = message.from;
    const text = message.text.body.trim();
    const lower = text.toLowerCase();

    const session = await getSession(from);

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
          reply =
  `🎉 *¡Reserva confirmada!*\n\n` +
  `📅 ${temp.date}\n` +
  `⏰ ${temp.time}\n` +
  `👥 ${temp.people}\n\n` +
  `🔐 Código: ${result.reservation?.reservation_code}\n\n` +
  `¿Qué querés hacer ahora?\n\n` +
  `1️⃣ Ver la carta 📖\n` +
  `2️⃣ Agregar una nota ✍️\n` +
  `3️⃣ Modificar esta reserva 🔄\n` +
  `4️⃣ Finalizar`;
        }
        await setState(from, "POST_RESERVATION_MENU");
        await setTemp(from, {});
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

  if (text === "1") {
    reply = "📖 Acá tenés la carta:\nhttps://turestaurante.com/menu";
  }

  else if (text === "2") {
    reply = "✍️ Escribí la nota que querés agregar a tu reserva.";
    await setState(from, "ADD_NOTE");
  }

  else if (text === "3") {
    reply = "🔄 ¿Qué querés modificar? (fecha / hora / personas)";
    await setState(from, "MODIFY_RESERVATION");
  }

  else if (text === "4") {
    reply = "Perfecto 👍 Gracias por tu reserva. ¡Te esperamos!";
    await setState(from, "INIT");
  }

  else {
    reply = "Elegí una opción válida:\n1, 2, 3 o 4 🙏";
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// =========================
// AGREGAR NOTA
// =========================
else if (session.state === "ADD_NOTE") {

  const note = text;

  const { error } = await supabase
    .from("appointments")
    .update({ notes: note })
    .eq("client_dni", session.temp_data?.dni)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ ERROR ADD NOTE:", error);
    reply = "No pude guardar la nota 😕";
  } else {
    reply = "✅ Nota agregada a tu reserva.";
  }

  await setState(from, "POST_RESERVATION_MENU");

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}

// =========================
// MODIFICAR RESERVA
// =========================
else if (session.state === "MODIFY_RESERVATION") {

  if (text.toLowerCase().includes("fecha")) {
    reply = "📅 Decime la nueva fecha (ej: 25/04)";
    await setState(from, "MODIFY_DATE");
  }

  else if (text.toLowerCase().includes("hora")) {
    reply = "⏰ Decime la nueva hora";
    await setState(from, "MODIFY_TIME");
  }

  else if (text.toLowerCase().includes("personas")) {
    reply = "👥 ¿Cuántas personas ahora?";
    await setState(from, "MODIFY_PEOPLE");
  }

  else {
    reply = "Decime qué querés cambiar: fecha, hora o personas";
  }

  await sendReply(from, reply);
  return new Response("EVENT_RECEIVED", { status: 200 });
}


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

    if (
      ai &&
      ["greeting", "create_reservation", "consult_reservation"].includes(ai.intent) &&
      (!session.state || ["INIT", "NEW_USER", "MENU"].includes(session.state))
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
      return new Response("EVENT_RECEIVED", { status: 200 });
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
    }

    else if (session.state === "ASK_TIME") {
      const time = text.includes(":") ? text : `${text}:00`;

      await setTemp(from, {
        ...session.temp_data,
        time,
      });

      reply = "👥 ¿Para cuántas personas?";
      await setState(from, "ASK_PEOPLE");
    }

    else if (session.state === "ASK_PEOPLE") {
      const people = parseInt(text);

      await setTemp(from, {
        ...session.temp_data,
        people,
      });

      reply = "Perfecto 👍 Ahora necesito tu DNI.";
      await setState(from, "ASK_DNI");
    }

    else if (session.state === "ASK_DNI") {

      if (!/^\d{7,8}$/.test(text)) {
        reply = "El DNI debe tener 7 u 8 números.";
      } else {

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
      }
    }

    else if (session.state === "REGISTER_NAME") {
      await supabase.from("clients").upsert({
        dni: session.temp_data?.dni,
        name: text,
        restaurant_id: restaurant.id,
      });

      reply = "Perfecto 🎉 Ahora tu email.";
      await setState(from, "ASK_EMAIL");
    }

    else if (session.state === "ASK_EMAIL") {
      await supabase
        .from("clients")
        .update({ email: text })
        .eq("dni", session.temp_data?.dni);

      reply = "🎂 Tu fecha de cumpleaños (ej: 15/08)";
      await setState(from, "ASK_BIRTHDAY");
    }

    else if (session.state === "ASK_BIRTHDAY") {
      const birthday = formatDateToISO(text);

      await supabase
        .from("clients")
        .update({ birthday })
        .eq("dni", session.temp_data?.dni);

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
        reply =
          `📅 ${data.date}\n` +
          `⏰ ${data.time}\n` +
          `👥 ${data.people}`;
      }
    }

    await sendReply(from, reply);

    return new Response("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}