import { supabase } from "@/lib/supabaseClient";

type Session = {
  step: "inicio" | "esperando_dni" | "esperando_nombre" | "confirmado";
  dni?: string;
  nombre?: string;
};

const sesiones: Record<string, Session> = {};

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

    if (!sesiones[from]) sesiones[from] = { step: "inicio" };
    const session = sesiones[from];

    let reply = "No entendí el mensaje 🤔";

    // ========================
    // PASO 1 — INICIO
    // ========================
    if (session.step === "inicio") {
      reply = "¡Hola! 👋\nEscribí *turno* para sacar un turno.";
      session.step = "esperando_dni";
    }

    // ========================
    // PASO 2 — PEDIR DNI
    // ========================
    else if (session.step === "esperando_dni") {
      if (!/^\d{7,8}$/.test(text)) {
        reply = "Por favor ingresá un DNI válido (7 u 8 números)";
      } else {
        session.dni = text;

        // 🔎 BUSCAR CLIENTE
        const { data: cliente } = await supabase
          .from("clients")
          .select("*")
          .eq("dni", text)
          .single();

        if (cliente) {
          session.nombre = cliente.name;
          session.step = "confirmado";
          reply = `Hola ${cliente.name} 😄\nTu turno será procesado.`;
        } else {
          session.step = "esperando_nombre";
          reply = "No estás registrado.\nDecime tu nombre y apellido.";
        }
      }
    }

    // ========================
    // PASO 3 — REGISTRAR CLIENTE
    // ========================
    else if (session.step === "esperando_nombre") {
      session.nombre = text;

      await supabase.from("clients").insert({
        dni: session.dni,
        name: session.nombre,
        phone: from,
      });

      session.step = "confirmado";

      reply = `Perfecto ${session.nombre} ✅\nTu turno fue registrado.`;
    }

    // ========================
    // RESPUESTA A META
    // ========================
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

    console.log("📡 Meta:", response.status, await response.text());

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("❌ ERROR:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}