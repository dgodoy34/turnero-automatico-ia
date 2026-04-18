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

    const business_id = req.headers.get("x-restaurant-id");

    if (!business_id) {
      return NextResponse.json(
        { success: false, error: "Missing business_id" },
        { status: 400 }
      );
    }

    console.log("👉 DATE:", date);
    console.log("👉 BUSINESS ID:", business_id);

    // 🔥 RANGO DE FECHA (FIX REAL)
    const startDate = `${date}T00:00:00`;
    const endDate = `${date}T23:59:59`;

    // 🔥 OVERRIDE
    const { data: override } = await supabase
      .from("restaurant_daily_table_override")
      .select("*")
      .eq("business_id", business_id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (override && override.length > 0) {
      return NextResponse.json({
        success: true,
        source: "override",
        schedule: override,
      });
    }

    // 🔥 SCHEDULE BASE (FIX)
    const { data: schedule, error } = await supabase
      .from("restaurant_table_schedule")
      .select("*")
      .eq("business_id", business_id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) throw error;

    console.log("📦 SCHEDULE FOUND:", schedule);

    // 🔥 TABLES
    const { data: tables } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("business_id", business_id);

    return NextResponse.json({
      success: true,
      source: "fallback",
      schedule: schedule || [],
      tables: tables || [],
    });

  } catch (err: any) {
    console.error("❌ ERROR:", err);

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}