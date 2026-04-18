import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Missing date" },
        { status: 400 }
      );
    }

    // 🔥 NORMALIZAR DATE (CLAVE)
    date = date.split("T")[0]; // por si viene raro

    const business_id = req.headers.get("x-restaurant-id");

    if (!business_id) {
      return NextResponse.json(
        { success: false, error: "Missing business_id" },
        { status: 400 }
      );
    }

    console.log("👉 DATE:", date);
    console.log("👉 BUSINESS ID:", business_id);

    // 🔥 QUERY SIMPLE Y CORRECTA
    const { data: schedule, error } = await supabase
      .from("restaurant_table_schedule")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (error) throw error;

    console.log("📦 SCHEDULE FOUND:", schedule);

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