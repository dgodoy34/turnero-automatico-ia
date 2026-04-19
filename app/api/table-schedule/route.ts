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

    // 🔥 RESERVAS
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .eq("date", date);

    // 🔥 INVENTARIO REAL (capacidad)
    const { data: inventory } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("business_id", businessId)
      .eq("date", date);

    // 🔥 HORARIOS DINÁMICOS (LOS BUENOS)
    const { data: schedules } = await supabase
      .from("restaurant_table_schedule")
      .select("start_time, end_time")
      .eq("business_id", businessId)
      .eq("date", date);

    console.log("📅 APPOINTMENTS:", appointments?.length || 0);
    console.log("📦 INVENTORY:", inventory?.length || 0);
    console.log("⏰ SCHEDULES:", schedules?.length || 0);

    return NextResponse.json({
      success: true,
      schedule: schedules || [],
      tables: inventory || [], // ✅ correcto
      appointments: appointments || [],
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json({ success: false });
  }
}