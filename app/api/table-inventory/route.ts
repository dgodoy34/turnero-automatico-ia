import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// ⚠️ 🔥 HARDCODE TEMPORAL (SOLUCIONA TODO YA)
const RESTAURANT_ID = "f9661b52-312d-46f6-9615-89aecfbb8a09";

// =========================
// GET INVENTARIO
// =========================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    console.log("🔥 GET TABLE INVENTORY");
    console.log("DATE:", date);
    console.log("RESTAURANT:", RESTAURANT_ID);

    // 🔹 inventario base
    const { data: baseTables, error: baseError } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity,quantity")
      .eq("restaurant_id", RESTAURANT_ID)
      .order("capacity", { ascending: true });

    if (baseError) {
      console.error("❌ BASE ERROR:", baseError);
      return NextResponse.json({
        success: false,
        error: baseError.message,
      });
    }

    // 🔹 override del día
    let override: any[] = [];

    if (date) {
      const { data: overrideData, error: overrideError } = await supabase
        .from("restaurant_daily_table_override")
        .select("capacity,quantity")
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("date", date); // ✅ IMPORTANTE

      if (overrideError) {
        console.error("❌ OVERRIDE ERROR:", overrideError);
      }

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

    console.log("✅ RESULT TABLES:", tables);

    return NextResponse.json({
      success: true,
      tables,
    });
  } catch (err: any) {
    console.error("💥 ERROR:", err);

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

    console.log("🔥 SAVE OVERRIDE");
    console.log("DATE:", date);
    console.log("TABLES:", tables);

    // 🔹 borrar override previo SOLO DE ESE DÍA
    await supabase
      .from("restaurant_daily_table_override")
      .delete()
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("date", date); // ✅ IMPORTANTE

    // 🔹 insertar nuevo override
    const rows = tables.map((t: any) => ({
      restaurant_id: RESTAURANT_ID,
      date,
      capacity: t.capacity,
      quantity: t.quantity,
    }));

    const { error } = await supabase
      .from("restaurant_daily_table_override")
      .insert(rows);

    if (error) {
      console.error("❌ INSERT ERROR:", error);

      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    console.error("💥 ERROR POST:", err);

    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}