import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // ⏰ 1h30 atrás
    const limit = new Date(Date.now() - 90 * 60 * 1000);

    // 🔍 buscar reservas sin confirmar
    const { data: reservations, error } = await supabase
      .from("appointments")
      .select("id, phone, reservation_code")
      .eq("status", "pending_confirmation")
      .lt("reminder_sent_at", limit.toISOString());

    if (error) throw error;

    let cancelled = 0;

    for (const r of reservations || []) {
      try {
        // ❌ cancelar reserva
        await supabase
          .from("appointments")
          .update({
            status: "cancelled",
          })
          .eq("id", r.id);

        cancelled++;

        console.log("⛔ AUTO CANCEL:", r.id);

      } catch (err) {
        console.error("ERROR CANCELANDO:", r.id, err);
      }
    }

    return NextResponse.json({
      ok: true,
      cancelled,
    });

  } catch (err) {
    console.error("AUTO CANCEL ERROR:", err);

    return NextResponse.json(
      { error: "error" },
      { status: 500 }
    );
  }
}