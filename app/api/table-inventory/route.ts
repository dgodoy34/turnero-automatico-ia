import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    let restaurant_id = searchParams.get("restaurant_id");

    // 🔥 TEMPORAL: si no viene el id, usamos el que sabíamos que funcionaba
    if (!restaurant_id) {
      restaurant_id = "f9661b52-312d-46f6-9615-89aecfbb8a09";
      console.warn("⚠️ restaurant_id no recibido, usando ID por defecto");
    }

    console.log("🔥 API table-inventory → restaurant_id:", restaurant_id, "date:", date);

    const { data: baseTables, error: baseError } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("restaurant_id", restaurant_id)
      .order("capacity", { ascending: true });

    if (baseError) {
      console.error("❌ Base error:", baseError);
      return NextResponse.json({ success: false, error: baseError.message }, { status: 400 });
    }

    // Override por día
    let override: any[] = [];
    if (date) {
      const { data: overrideData } = await supabase
        .from("restaurant_daily_table_override")
        .select("capacity, quantity")
        .eq("restaurant_id", restaurant_id)
        .eq("date", date);

      if (overrideData) override = overrideData;
    }

    const tables = (baseTables || []).map((t: any) => ({
      capacity: t.capacity,
      quantity: override.find((o) => o.capacity === t.capacity)?.quantity ?? t.quantity,
    }));

    console.log("✅ Mesas devueltas:", tables.length, tables);

    return NextResponse.json({ success: true, tables });
  } catch (err: any) {
    console.error("💥 Error en API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}