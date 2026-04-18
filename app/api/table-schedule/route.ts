import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Missing date" },
        { status: 400 }
      );
    }

    // 🔥 USAR HEADER (MISMO QUE APPOINTMENTS)
    const business_id = req.headers.get("x-restaurant-id");

    if (!business_id) {
      return NextResponse.json(
        { success: false, error: "Missing business_id" },
        { status: 400 }
      );
    }

    console.log("👉 DATE:", date);
    console.log("👉 BUSINESS ID:", business_id);

    // 🔥 1. OVERRIDE
    const { data: override, error: overrideError } = await supabase
      .from("restaurant_daily_table_override")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (overrideError) throw overrideError;

    if (override && override.length > 0) {
      console.log("✅ USING OVERRIDE");

      return NextResponse.json({
        success: true,
        source: "override",
        schedule: override,
      });
    }

    // 🔥 2. SCHEDULE BASE (CORRECTO)
    const { data: schedule, error: scheduleError } = await supabase
      .from("restaurant_table_schedule")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (scheduleError) throw scheduleError;

    console.log("📦 SCHEDULE FOUND:", schedule);

    // 🔥 3. INVENTORY (CAPACIDAD)
    const { data: tables, error: tablesError } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("business_id", business_id);

    if (tablesError) throw tablesError;

    console.log("📦 TABLES:", tables);

    return NextResponse.json({
      success: true,
      source: "fallback",
      schedule: schedule || [],
      tables: tables || [],
    });

  } catch (err: any) {
    console.error("❌ API ERROR:", err);

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}