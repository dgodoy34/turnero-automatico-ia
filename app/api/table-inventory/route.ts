import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const restaurant_id = "1"; // 🔥 FIJO para recuperar el sistema

    // 🔹 INVENTARIO BASE (OBLIGATORIO)
    const { data: baseTables } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity,quantity")
      .eq("restaurant_id", restaurant_id)
      .order("capacity", { ascending: true });

    if (!baseTables || baseTables.length === 0) {
      return NextResponse.json({
        success: true,
        tables: [],
      });
    }

    // 🔹 override del día (opcional)
    let override: any[] = [];

    if (date) {
      const { data } = await supabase
        .from("restaurant_daily_table_override")
        .select("capacity,quantity")
        .eq("restaurant_id", restaurant_id)
        .eq("date", date);

      if (data) override = data;
    }

    // 🔹 merge correcto
    const tables = baseTables.map((t: any) => {
      const o = override.find((x) => x.capacity === t.capacity);

      return {
        capacity: t.capacity,
        quantity: o ? o.quantity : t.quantity,
      };
    });

    return NextResponse.json({
      success: true,
      tables,
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}