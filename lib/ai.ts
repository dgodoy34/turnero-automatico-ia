import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function interpretMessage(message: string) {
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    input: `
Sos un sistema que interpreta mensajes de clientes de restaurante.

Fecha actual: ${new Date().toISOString().split("T")[0]}

NO respondas como humano.
NO expliques nada.
NO agregues texto adicional.

Respondé ÚNICAMENTE con JSON válido:

{
  "intent": "create_reservation | cancel_reservation | consult_reservation | modify_reservation | menu | greeting | unknown",
  "date": null,
  "time": null,
  "people": null
}

Reglas:
- Interpretá lenguaje natural:
  - "mañana" → fecha real
  - "hoy" → fecha actual
  - "tipo 9" → 21:00
  - "a la noche" → 21:00
- Si no podés inferir → null
- Fecha formato YYYY-MM-DD
- Hora formato HH:mm
- SOLO JSON

"${message}"
`
  });

  const raw = response.output_text.trim();

// Limpiar posibles bloques ```json
const cleaned = raw
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

return JSON.parse(cleaned);
}