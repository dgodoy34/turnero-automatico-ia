import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    let restaurant_id =
      searchParams.get("restaurant_id") ||
      "f9661b52-312d-46f6-9615-89aecfbb8a09";

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    console.log("🔥 table-inventory:", { restaurant_id, date });

    const { data, error } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("restaurant_id", restaurant_id)
      .eq("date", date);

    if (error) {
      console.error("❌ DB error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // 🔥 SUMAR cantidades (día + noche)
    const map = new Map<number, number>();

    data?.forEach((row: any) => {
      const current = map.get(row.capacity) || 0;
      map.set(row.capacity, current + row.quantity);
    });

    const tables = Array.from(map.entries()).map(
      ([capacity, quantity]) => ({
        capacity,
        quantity,
      })
    );

    console.log("✅ Resultado final:", tables);

    return NextResponse.json({ success: true, tables });
  } catch (err: any) {
    console.error("💥 Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}