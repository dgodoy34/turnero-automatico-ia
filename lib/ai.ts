import OpenAI from "openai";

function getNowArgentina() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
}

function getTodayArgentinaISO() {
  const now = getNowArgentina();
  return now.toISOString().split("T")[0];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function interpretMessage(message: string) {
 const today = getTodayArgentinaISO();

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    input: `
Sos un parser de intención para un bot de reservas de restaurante.

- "consultar reserva", "ver reserva", "tengo una reserva" = consult_reservation
- "modificar reserva", "cambiar reserva" = modify_reservation

Fecha actual: ${today}

Tu tarea:
Convertir el mensaje del usuario en JSON estructurado.

IMPORTANTE:
- SOLO devolver JSON válido
- NO texto adicional
- NO explicaciones

Formato exacto:

{
  "intent": "create_reservation | consult_reservation | modify_reservation | greeting | unknown",
  "date": "YYYY-MM-DD | null",
  "time": "HH:mm | null",
  "people": number | null
}

Reglas:
- "mañana" = fecha actual +1
- "hoy" = fecha actual
- "pasado mañana" = +2 días
- "tipo 9", "a las 9", "9pm" = 21:00
- "a la noche" = 21:00
- "al mediodía" = 13:00
- personas: número entero
- Si falta info → null

Ejemplos:

Usuario: "hola"
→ {"intent":"greeting","date":null,"time":null,"people":null}

Usuario: "quiero reservar"
→ {"intent":"create_reservation","date":null,"time":null,"people":null}

Usuario: "reserva para 4 mañana a las 9"
→ {"intent":"create_reservation","date":"${today}","time":"21:00","people":4}

Usuario: "tengo una reserva"
→ {"intent":"consult_reservation","date":null,"time":null,"people":null}

Mensaje:
"${message}"
`
  });

  let raw = response.output_text.trim();

  // limpieza ultra defensiva
  raw = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ IA PARSE ERROR:", raw);

    return {
      intent: "unknown",
      date: null,
      time: null,
      people: null,
    };
  }
}