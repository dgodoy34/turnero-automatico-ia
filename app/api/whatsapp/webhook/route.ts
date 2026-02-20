import { supabase } from "@/lib/supabaseClient";
import { getSession, setSession, clearSession } from "@/lib/sessionStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const change = body?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || message.type !== "text")
      return new Response("EVENT_RECEIVED", { status: 200 });

    const from = message.from;
    const text = message.text?.body?.trim() || "";

    console.log("📩 Mensaje:", text, "De:", from);

    // =========================
    // BUSCAR CLIENTE EN BD
    // =========================
    const { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("telefono", from)
      .single();

    let session = getSession(from);
    let reply = "No entendí el mensaje 🤔";

    // =========================
    // CLIENTE YA EXISTE
    // =========================
    if (cliente && !session) {
      reply = `Hola ${cliente.nombre} 👋\n¿Querés sacar otro turno? Escribí *turno*`;
    }

    // =========================
    // FLUJO NUEVO
    // =========================
    if (text.toLowerCase() === "hola") {
      reply = "¡Hola! 👋\nEscribí *turno* para sacar un turno.";
    }

    else if (text.toLowerCase() === "turno") {
      setSession(from, { step: "dni" });
      reply = "Perfecto 👍\nDecime tu DNI";
    }

    else if (session?.step === "dni" && /^\d{7,8}$/.test(text)) {
      setSession(from, { step: "nombre", dni: text });
      reply = "Gracias 🙌\nAhora decime tu nombre y apellido";
    }

    else if (session?.step === "nombre") {

      // GUARDAR CLIENTE
      await supabase.from("clientes").insert({
        telefono: from,
        nombre: text,
        dni: session.dni
      });

      clearSession(from);

      reply = `Perfecto ${text} ✅\nTu turno fue registrado.\nEn breve te confirmamos horario.`;
    }

    // =========================
    // ENVIAR RESPUESTA A META
    // =========================
    console.log("⏳ Enviando respuesta a Meta...");

    const response = await fetch(
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

    const data = await response.text();
    console.log("📡 Meta respondió:", response.status, data);

    return new Response("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}