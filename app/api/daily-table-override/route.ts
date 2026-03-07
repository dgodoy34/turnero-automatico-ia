import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {

  const body = await req.json();
  const { date, tables } = body;

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id")
    .limit(1)
    .single();

  if (error || !restaurant) {
    return NextResponse.json(
      { success: false, error: "Restaurante no encontrado" },
      { status: 400 }
    );
  }

  for (const t of tables) {

    await supabase
      .from("restaurant_daily_table_override")
      .upsert({
        restaurant_id: restaurant.id,
        date,
        capacity: t.capacity,
        quantity: t.quantity
      });

  }

  return NextResponse.json({ success: true });

}