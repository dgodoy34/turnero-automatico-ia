import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { setState, setTemp } from "@/lib/conversation";

// 🇦🇷 Hora Argentina REAL
function getNowArgentina() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
}

// 🇦🇷 Crear fecha/hora en Argentina
function getArgentinaDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`);
}

// YYYY-MM-DD Argentina
function getTodayArgentina() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export async function GET() {
  try {
    const now = getNowArgentina();
    const todayStr = getTodayArgentina();

    console.log("🕒 NOW:", now.toISOString());
    console.log("📅 TODAY:", todayStr);

    const { data: reservations, error } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        reservation_code,
        status,
        reminder_sent,
        responded_at,
        clients (
          phone,
          name
        )
      `)
      .eq("date", todayStr)
      .eq("reminder_sent", false)
      .is("responded_at", null)
      .in("status", ["confirmed", "pending_confirmation"]);

    if (error) throw error;

    console.log("📊 RESERVAS FILTRADAS:", reservations?.length);

    let sent = 0;

    for (const r of reservations || []) {

      const client = r.clients?.[0];
      const phone = client?.phone;
      const name = client?.name;

      if (!phone) continue;

      console.log("➡️ RESERVA RAW:", r.date, r.time);

      const reservationDateTime = getArgentinaDateTime(r.date, r.time);

      console.log("🕓 RESERVA DATE:", reservationDateTime.toISOString());

      const diffMinutes =
        (reservationDateTime.getTime() - now.getTime()) / 60000;

      console.log("⏱ diffMinutes:", diffMinutes);

      const shouldSend =
        diffMinutes <= 120 && diffMinutes > 100;

      if (!shouldSend) continue;

      const message = `Hola ${name || ""} 👋

Te recordamos tu reserva hoy a las *${r.time} hs* 🕒

Respondé *SI* para confirmar 👍
O *CANCELAR* si no podés asistir ❌`;

      try {
        await sendWhatsAppMessage(phone, message);

        await setState(phone, "AWAITING_CONFIRMATION");

        await setTemp(phone, {
          reservation_id: r.id,
          reservation_code: r.reservation_code,
        });

        await supabase
          .from("appointments")
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
            status: "pending_confirmation",
          })
          .eq("id", r.id);

        sent++;

      } catch (err) {
        console.error("❌ ERROR ENVIANDO:", phone, err);
      }
    }

    console.log("✅ REMINDERS SENT:", sent);

    return NextResponse.json({ ok: true, sent });

  } catch (err) {
    console.error("CRON REMINDER ERROR:", err);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}