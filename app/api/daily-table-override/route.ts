import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function POST(req: Request) {
  try {
    // 🔥 en realidad es business_id
    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    console.log("business_id", business_id);

    const body = await req.json();
    const { date, tables } = body;

    const rows = tables.map((t: any) => ({
      business_id, // 🔥 FIX CLAVE
      date,
      capacity: t.capacity,
      quantity: t.quantity,
    }));

    const { error } = await supabase
      .from("restaurant_daily_table_override")
      .upsert(rows, {
        onConflict: "business_id,date,capacity", // 🔥 FIX CLAVE
      });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}