import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request){

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

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

  // inventario base
  const { data:baseTables } = await supabase
    .from("restaurant_table_inventory")
    .select("capacity,quantity")
    .eq("restaurant_id", restaurant.id)
    .order("capacity",{ ascending:true });

  // override del día
  let override:any[] = [];

  if(date){

    const { data } = await supabase
      .from("restaurant_daily_table_override")
      .select("capacity,quantity")
      .eq("restaurant_id", restaurant.id)
      .eq("date", date);

    override = data || [];

  }

  // aplicar override
  const tables = baseTables?.map(t => {

    const o = override.find(x => x.capacity === t.capacity);

    return {
      capacity: t.capacity,
      quantity: o ? o.quantity : t.quantity
    };

  });

  return NextResponse.json({
    success:true,
    tables
  });

}



export async function POST(req: Request){

  try{

    const body = await req.json();
    const { date, tables } = body;

    if(!date){
      return NextResponse.json({
        success:false,
        error:"Fecha requerida"
      });
    }

    // obtener restaurante
    const { data:restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .limit(1)
      .single();

    if(!restaurant){
      return NextResponse.json({
        success:false,
        error:"Restaurante no encontrado"
      });
    }

    // borrar override previo
    await supabase
      .from("restaurant_daily_table_override")
      .delete()
      .eq("restaurant_id", restaurant.id)
      .eq("date", date);

    // insertar nuevo override
    const rows = tables.map((t:any)=>({
      restaurant_id: restaurant.id,
      date,
      capacity: t.capacity,
      quantity: t.quantity
    }));

    const { error } = await supabase
      .from("restaurant_daily_table_override")
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

  }catch(err:any){

    return NextResponse.json({
      success:false,
      error:err.message
    });

  }

}