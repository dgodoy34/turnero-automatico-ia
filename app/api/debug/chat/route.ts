import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { restaurantHandler } from "@/lib/restaurants/restaurantHandler";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const message = body.message;
    const from = body.from || "TEST_USER";
    const restaurant_id = body.restaurant_id;

    // 🔥 validar datos
    if (!message || !restaurant_id) {
      return NextResponse.json({
        error: "Faltan datos"
      });
    }

    // 🔥 traer restaurante real
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurant_id)
      .single();

    if (!restaurant || error) {
      return NextResponse.json({
        error: "Restaurant not found"
      });
    }

    // 🔥 ejecutar BOT REAL (no fake)
    const result = await restaurantHandler({
      from,
      message,
      restaurant
    });

    return NextResponse.json({
      reply: result?.reply || "⚠️ Sin respuesta"
    });

  } catch (err: any) {

    console.error("❌ DEBUG CHAT ERROR:", err);

    return NextResponse.json({
      error: err.message
    });

  }

}