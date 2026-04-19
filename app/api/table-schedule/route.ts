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

    // 🔥 1. RESERVAS
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", date)
      .eq("business_id", businessId);

    // 🔥 2. INVENTORY
    const { data: inventory } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("business_id", businessId)
      .eq("date", date);

    // 🔥 3. HORARIOS DINÁMICOS (LA CLAVE)
    const { data: schedules } = await supabase
      .from("restaurant_schedules")
      .select("start_time, end_time")
      .eq("business_id", businessId)
      .eq("date", date);

    console.log("📅 APPOINTMENTS:", appointments?.length || 0);
    console.log("📦 INVENTORY:", inventory?.length || 0);
    console.log("⏰ SCHEDULES:", schedules?.length || 0);

    return NextResponse.json({
      success: true,
      source: "database",
      schedule: schedules || [],
      tables: inventory || [],
      appointments: appointments || [],
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json({ success: false });
  }
}