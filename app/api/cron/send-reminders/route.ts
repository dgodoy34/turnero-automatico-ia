import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { setState, setTemp } from "@/lib/conversation"; // 🔥 CLAVE

function getNowArgentina() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
}

function formatDateLocal(date: Date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export async function GET() {
  try {
    const now = getNowArgentina();

    // ⏰ ventana: entre 2h y 3h antes
    const from = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const todayStr = formatDateLocal(now);

    const { data: reservations, error } = await supabase
      .from("appointments")
      .select("id, date, time, phone, name, reservation_code")
      .eq("date", todayStr)
      .eq("reminder_sent", false)
      .not("phone", "is", null);

    if (error) throw error;

    let sent = 0;

    for (const r of reservations) {
      const reservationDateTime = new Date(`${r.date}T${r.time}`);

      if (reservationDateTime >= from && reservationDateTime <= to) {

        const message = `Hola ${r.name || ""} 👋

Te recordamos tu reserva hoy a las *${r.time} hs* 🕒

Respondé *SI* para confirmar 👍
O *CANCELAR* si no podés asistir ❌`;

        try {
          // 📲 ENVIAR WHATSAPP
          await sendWhatsAppMessage(r.phone, message);

          // 🔥 GUARDAR CONTEXTO PARA RESPUESTA
          await setState(r.phone, "AWAITING_CONFIRMATION");

          await setTemp(r.phone, {
            reservation_id: r.id,
            reservation_code: r.reservation_code,
          });

          // ✅ MARCAR EN BD
          await supabase
  .from("appointments")
  .update({
    reminder_sent: true,
    reminder_sent_at: new Date().toISOString(),
    status: "pending_confirmation", // 🔥 CLAVE
  })
  .eq("id", r.id);

          sent++;

        } catch (err) {
          console.error("ERROR ENVIANDO:", r.phone, err);
        }
      }
    }

    return NextResponse.json({ ok: true, sent });

  } catch (err) {
    console.error("CRON REMINDER ERROR:", err);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}