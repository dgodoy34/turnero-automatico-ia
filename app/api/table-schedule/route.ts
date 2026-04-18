import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

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

    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    // 🔥 1. OVERRIDE (horarios especiales)
    const { data: override } = await supabase
      .from("restaurant_daily_table_override")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    let schedules = [];

    if (override && override.length > 0) {
      schedules = override;
    } else {
      // 🔥 2. SCHEDULE BASE
      const { data: fallback } = await supabase
        .from("restaurant_table_schedule")
        .select("*")
        .eq("business_id", business_id);

      schedules = fallback || [];
    }

    // 🔥 3. CAPACIDAD REAL (MESAS)
    const { data: tables } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("business_id", business_id);

    return NextResponse.json({
      success: true,
      schedule: schedules,
      tables: tables || [],
    });

  } catch (err: any) {
    console.error("TABLE-SCHEDULE ERROR:", err);

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}