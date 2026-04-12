import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // ⏱️ hace 1h30
    const limit = new Date(Date.now() - 90 * 60 * 1000);

    const { data: reservations, error } = await supabase
      .from("appointments")
      .select("id, phone, name")
      .eq("status", "pending_confirmation")
      .lt("reminder_sent_at", limit.toISOString());

    if (error) throw error;

    let cancelled = 0;

    for (const r of reservations || []) {

      // ❌ cancelar
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", r.id);

      cancelled++;

      // 📲 opcional: avisar
      /*
      await sendWhatsAppMessage(
        r.phone,
        `❌ Tu reserva fue cancelada por falta de confirmación.\n\nPodés reservar nuevamente cuando quieras 😉`
      );
      */
    }

    console.log("AUTO CANCEL:", cancelled);

    return NextResponse.json({ ok: true, cancelled });

  } catch (err) {
    console.error("AUTO CANCEL ERROR:", err);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}