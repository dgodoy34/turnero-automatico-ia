import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function POST(req: Request){

try{

const restaurant_id = await getRestaurantId(
  process.env.WHATSAPP_PHONE_NUMBER_ID!
);

const body = await req.json();

const { date, tables } = body;


// borrar override anterior del restaurante

await supabase
.from("daily_table_override")
.delete()
.eq("restaurant_id", restaurant_id)
.eq("date", date);


// crear filas nuevas

const rows = tables.map((t:any)=>({
restaurant_id,
date,
capacity: t.capacity,
quantity: t.quantity
}));


const { error } = await supabase
.from("daily_table_override")
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

return NextResponse.json(
{ success:false,error:err.message },
{ status:500 }
);

}

}