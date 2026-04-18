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

    // 🔥 1. OVERRIDE (por fecha específica)
    const { data: override, error: overrideError } = await supabase
      .from("restaurant_daily_table_override")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (overrideError) throw overrideError;

    if (override && override.length > 0) {
      return NextResponse.json({
        success: true,
        source: "override",
        schedule: override,
      });
    }

    // 🔥 2. FALLBACK (SCHEDULE BASE SIN FILTRAR POR DATE)
    const { data: fallback, error: fallbackError } = await supabase
      .from("restaurant_table_schedule")
      .select("*")
      .eq("business_id", business_id);

    if (fallbackError) throw fallbackError;

    return NextResponse.json({
      success: true,
      source: "fallback",
      schedule: fallback ?? [],
    });

  } catch (err: any) {
    console.error("TABLE-SCHEDULE ERROR:", err);

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}