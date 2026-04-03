import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    let restaurant_id = searchParams.get("restaurant_id");

    if (!restaurant_id) {
      restaurant_id = "f9661b52-312d-46f6-9615-89aecfbb8a09";
      console.warn("⚠️ restaurant_id no recibido, usando ID por defecto");
    }

    console.log("🔥 API table-inventory →", restaurant_id, date);

    // ✅ TRAER SOLO ESE DÍA
    const { data, error } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("restaurant_id", restaurant_id)
      .eq("date", date)
      .order("capacity", { ascending: true });

    if (error) {
      console.error("❌ Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // ✅ AGRUPAR (PORQUE TENÉS DÍA + NOCHE)
    const grouped: any = {};

    (data || []).forEach((row: any) => {
      if (!grouped[row.capacity]) {
        grouped[row.capacity] = {
          capacity: row.capacity,
          quantity: 0
        };
      }

      grouped[row.capacity].quantity += row.quantity;
    });

    const tables = Object.values(grouped);

    console.log("✅ Mesas devueltas:", tables.length, tables);

    return NextResponse.json({ success: true, tables });

  } catch (err: any) {
    console.error("💥 Error en API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}