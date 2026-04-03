import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    let restaurant_id = searchParams.get("restaurant_id") || "f9661b52-312d-46f6-9615-89aecfbb8a09";

    if (!date) {
      return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });
    }

    console.log("📅 API table-inventory → date:", date, "restaurant_id:", restaurant_id);

    // Traemos SOLO la configuración del día específico
    const { data, error } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity, start_time, end_time")
      .eq("restaurant_id", restaurant_id)
      .eq("date", date)
      .order("capacity", { ascending: true });

    if (error) {
      console.error("❌ Error en consulta:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Agrupamos por capacity (por si hay duplicados por error)
    const tablesMap = new Map();

    data?.forEach((row: any) => {
      if (!tablesMap.has(row.capacity)) {
        tablesMap.set(row.capacity, {
          capacity: row.capacity,
          quantity: row.quantity
        });
      }
    });

    const tables = Array.from(tablesMap.values());

    console.log("✅ Mesas devueltas para el día:", tables);

    return NextResponse.json({ success: true, tables });

  } catch (err: any) {
    console.error("💥 Error en API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}