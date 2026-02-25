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

NO respondas como humano.
NO expliques nada.
NO agregues texto adicional.

Respondé ÚNICAMENTE con JSON válido con esta estructura exacta:

{
  "intent": "create_reservation | cancel_reservation | consult_reservation | modify_reservation | menu | greeting | unknown",
  "date": null,
  "time": null,
  "people": null
}

Reglas:
- Si detectás intención de reservar → intent=create_reservation
- Si quiere cambiar una reserva → modify_reservation
- Si quiere cancelar → cancel_reservation
- Si quiere consultar → consult_reservation
- Si pregunta por comida → menu
- Si saluda → greeting
- Si no entendés → unknown

Si no hay fecha, hora o personas → null
Fecha siempre en formato YYYY-MM-DD si es posible.
Hora en formato HH:mm si es posible.

Mensaje del cliente:
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