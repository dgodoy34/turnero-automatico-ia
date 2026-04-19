import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date");
    const businessId = req.headers.get("x-restaurant-id");

    if (!date || !businessId) {
      return NextResponse.json({ success: false, error: "Missing params" });
    }

    console.log("👉 DATE:", date);
    console.log("👉 BUSINESS:", businessId);

    // 🔥 1. TRAER RESERVAS
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", date)
      .eq("business_id", businessId);

    console.log("📅 APPOINTMENTS:", appointments?.length || 0);

    // 🔥 2. TRAER INVENTORY (opcional)
    const { data: inventory } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("business_id", businessId)
      .eq("date", date);

    console.log("📦 INVENTORY:", inventory?.length || 0);

    // 🔥 3. SIEMPRE HORARIOS (NO DEPENDEN DE DB)
    const schedule = [
      { start_time: "12:00", end_time: "16:00" },
      { start_time: "20:00", end_time: "23:30" },
    ];

    return NextResponse.json({
      success: true,
      source: "stable",
      schedule,
      tables: inventory || [],
      appointments: appointments || [],
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json({ success: false });
  }
}