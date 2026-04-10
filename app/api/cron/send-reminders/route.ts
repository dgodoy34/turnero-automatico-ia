import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

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

    const from = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const todayStr = formatDateLocal(now);

    const { data: reservations, error } = await supabase
      .from("appointments")
      .select("id, reservation_date, reservation_time, phone, name")
      .eq("reservation_date", todayStr)
      .eq("reminder_sent", false);

    if (error) throw error;

    let sent = 0;

    for (const r of reservations) {
      const reservationDateTime = new Date(
        `${r.reservation_date}T${r.reservation_time}`
      );

      if (reservationDateTime >= from && reservationDateTime <= to) {
        const message = `Hola ${r.name || ""} 👋

Te recordamos tu reserva hoy a las *${r.reservation_time} hs* 🕒

Respondé *SI* para confirmar 👍
O *CANCELAR* si no podés asistir ❌`;

        try {
          await sendWhatsAppMessage(r.phone, message);

          await supabase
            .from("appointments")
            .update({
              reminder_sent: true,
              reminder_sent_at: new Date().toISOString(),
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