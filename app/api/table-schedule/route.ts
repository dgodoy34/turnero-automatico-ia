import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function GET(req: Request) {

  try {

    const restaurant_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const { data, error } = await supabase
      .from("restaurant_table_schedule")
      .select("*")
      .eq("restaurant_id", restaurant_id);

    if (error) throw error;

    return NextResponse.json({ success: true, schedule: data ?? [] });

  } catch (err: any) {

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );

  }

}

export async function POST(req: Request) {

  try {

    const restaurant_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const body = await req.json();

    const { data, error } = await supabase
      .from("restaurant_table_schedule")
      .insert({
        ...body,
        restaurant_id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, schedule: data });

  } catch (err: any) {

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );

  }

}