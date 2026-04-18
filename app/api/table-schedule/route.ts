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

    console.log("👉 DATE:", date);
    console.log("👉 BUSINESS ID:", business_id);

    // 🔥 1. INVENTARIO REAL (BASE)
    const { data: inventory, error: inventoryError } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (inventoryError) throw inventoryError;

    console.log("📦 INVENTORY:", inventory);

    return NextResponse.json({
      success: true,
      source: "inventory",
      schedule: inventory ?? []
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}