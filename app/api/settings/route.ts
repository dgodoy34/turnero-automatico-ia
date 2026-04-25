import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

// ==========================
// 🔹 GET SETTINGS
// ==========================
export async function GET() {
  try {
    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("business_id", business_id)
      .single();

    if (error) {
      console.error("GET settings error:", error);
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({
      settings: data,
      business_id, // 🔥 IMPORTANTE
    });

  } catch (err: any) {
    console.error("GET settings crash:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}


// ==========================
// 🔹 SAVE SETTINGS
// ==========================
export async function POST(req: Request) {
  try {
    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const body = await req.json();

    const {
      open_time,
      close_time,
      slot_interval,
      reservation_duration,
      buffer_time,
    } = body;

    const { error } = await supabase
      .from("settings")
      .upsert({
        business_id, // 🔥 CLAVE MULTI-TENANT
        open_time,
        close_time,
        slot_interval,
        reservation_duration,
        buffer_time,
      });

    if (error) {
      console.error("POST settings error:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("POST settings crash:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}