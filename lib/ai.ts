import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function interpretMessage(message: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
Sos un sistema que interpreta mensajes de clientes de restaurante.
NO respondas como humano.
NO inventes datos.
Solo devolvé JSON válido con esta estructura:

{
  "intent": "create_reservation | cancel_reservation | consult_reservation | menu | greeting | unknown",
  "date": null,
  "time": null,
  "people": null
}

Si no hay datos, poner null.
`
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  return JSON.parse(completion.choices[0].message.content!);
}