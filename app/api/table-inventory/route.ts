import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const restaurant_id = searchParams.get("restaurant_id");   // ← ahora acepta por query

    // Si no viene por query, usamos el que tenías antes (temporal)
    const RESTAURANT_ID = restaurant_id || "f9661b52-312d-46f6-9615-89aecfbb8a09";

    console.log("🔥 GET TABLE INVENTORY - Restaurant:", RESTAURANT_ID, "Date:", date);

    // Base inventory
    const { data: baseTables, error: baseError } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity,quantity")
      .eq("restaurant_id", RESTAURANT_ID)
      .order("capacity", { ascending: true });

    if (baseError) {
      console.error("Base error:", baseError);
      return NextResponse.json({ success: false, error: baseError.message }, { status: 400 });
    }

    // Override del día (si hay fecha)
    let override: any[] = [];
    if (date) {
      const { data: overrideData } = await supabase
        .from("restaurant_daily_table_override")
        .select("capacity,quantity")
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("date", date);

      if (overrideData) override = overrideData;
    }

    const tables = (baseTables || []).map((t: any) => {
      const o = override.find((x) => x.capacity === t.capacity);
      return {
        capacity: t.capacity,
        quantity: o ? o.quantity : t.quantity,
      };
    });

    console.log("✅ Tables devueltas:", tables);

    return NextResponse.json({ success: true, tables });
  } catch (err: any) {
    console.error("💥 Error API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}