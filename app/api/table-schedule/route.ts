import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function GET(req: Request) {
  try {
    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    let query = supabase
      .from("restaurant_table_schedule")
      .select("*")
      .eq("business_id", business_id);

    // 🔥 FILTRO POR FECHA (CLAVE)
    if (date) {
      query = query.eq("date", date);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      schedule: data ?? []
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const body = await req.json();

    const { data, error } = await supabase
      .from("restaurant_table_schedule")
      .insert({
        ...body,
        business_id // 🔥 corregido (antes estaba mal)
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      schedule: data
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}