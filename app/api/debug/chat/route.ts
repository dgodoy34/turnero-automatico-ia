import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleMessage } from "@/lib/botHandler";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const message = body.message;
    const from = body.from || "TEST_USER";
    const restaurant_id = body.restaurant_id;

    // 🔥 traer restaurante real
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurant_id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" });
    }

    // 🔥 ejecutar lógica del bot DIRECTO
    const result = await handleMessage({
      from,
      message,
      restaurant
    });

    return NextResponse.json({
      reply: result.reply
    });

  } catch (err: any) {

    return NextResponse.json({
      error: err.message
    });

  }

}