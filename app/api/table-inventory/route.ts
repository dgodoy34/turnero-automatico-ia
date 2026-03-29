import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

// =========================
// GET INVENTARIO
// =========================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    // ✅ obtener restaurant correcto
    const restaurant_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: "Restaurante no encontrado" },
        { status: 400 }
      );
    }

    // 🔹 inventario base
    const { data: baseTables, error: baseError } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity,quantity")
      .eq("restaurant_id", restaurant_id)
      .order("capacity", { ascending: true });

    if (baseError) {
      return NextResponse.json({
        success: false,
        error: baseError.message,
      });
    }

    // 🔹 override del día
    let override: any[] = [];

    if (date) {
      const { data: overrideData } = await supabase
        .from("restaurant_daily_table_override")
        .select("capacity,quantity")
        .eq("restaurant_id", restaurant_id)
       

      if (overrideData) {
        override = overrideData;
      }
    }

    // 🔹 aplicar override
    const tables = (baseTables || []).map((t: any) => {
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

// =========================
// POST OVERRIDE
// =========================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, tables } = body;

    if (!date) {
      return NextResponse.json({
        success: false,
        error: "Fecha requerida",
      });
    }

    // ✅ obtener restaurant correcto
    const restaurant_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: "Restaurante no encontrado" },
        { status: 400 }
      );
    }

    // 🔹 borrar override previo
    await supabase
      .from("restaurant_daily_table_override")
      .delete()
      .eq("restaurant_id", restaurant_id)
      

    // 🔹 insertar nuevo override
    const rows = tables.map((t: any) => ({
      restaurant_id,
      date,
      capacity: t.capacity,
      quantity: t.quantity,
    }));

    const { error } = await supabase
      .from("restaurant_daily_table_override")
      .insert(rows);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}