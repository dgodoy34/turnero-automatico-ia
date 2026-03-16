import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request){

  const body = await req.json();
  const { tables } = body;

  // obtener restaurante
  const { data:restaurant, error:restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .limit(1)
    .single();

  if(restaurantError || !restaurant){
    return NextResponse.json({
      success:false,
      error:"Restaurante no encontrado"
    },{ status:400 });
  }

  // borrar inventario actual
  await supabase
    .from("restaurant_table_inventory")
    .delete()
    .eq("restaurant_id", restaurant.id);

  // insertar nuevo inventario
  const rows = tables.map((t:any)=>({
    restaurant_id: restaurant.id,
    capacity: t.capacity,
    quantity: t.quantity
  }));

  const { error } = await supabase
    .from("restaurant_table_inventory")
    .insert(rows);

  if(error){
    return NextResponse.json({
      success:false,
      error:error.message
    });
  }

  return NextResponse.json({
    success:true
  });

}