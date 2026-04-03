import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date");
    const shift = searchParams.get("shift"); // 👈 NUEVO
    let restaurant_id =
      searchParams.get("restaurant_id") ||
      "f9661b52-312d-46f6-9615-89aecfbb8a09";

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity, start_time")
      .eq("restaurant_id", restaurant_id)
      .eq("date", date);

    // 🔥 FILTRO POR TURNO
    if (shift === "Día") {
      query = query.lte("start_time", "16:00");
    }

    if (shift === "Noche") {
      query = query.gt("start_time", "16:00");
    }

    const { data, error } = await query.order("capacity", {
      ascending: true,
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.log("✅ Mesas filtradas:", shift, data);

    return NextResponse.json({
      success: true,
      tables: data,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}