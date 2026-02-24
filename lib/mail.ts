import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReservationEmail({
  to,
  name,
  date,
  time,
  people,
  code
}: {
  to: string;
  name: string;
  date: string;
  time: string;
  people: number;
  code: string;
}) {
  await resend.emails.send({
    from: "Reservas <reservas@tudominio.com>",
    to,
    subject: "Confirmación de Reserva",
    html: `
      <h2>Hola ${name} 👋</h2>
      <p>Tu reserva fue confirmada:</p>
      <ul>
        <li><strong>Fecha:</strong> ${date}</li>
        <li><strong>Hora:</strong> ${time}</li>
        <li><strong>Personas:</strong> ${people}</li>
        <li><strong>Código:</strong> ${code}</li>
      </ul>
      <p>¡Te esperamos! 😊</p>
    `
  });
}