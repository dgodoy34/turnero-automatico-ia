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


// preparar filas

const rows = tables.map((t:any)=>({
restaurant_id,
date,
capacity: t.capacity,
quantity: t.quantity
}));


// UPSERT (actualiza o crea)

const { error } = await supabase
.from("restaurant_daily_table_override")
.upsert(rows,{
onConflict:"restaurant_id,date,capacity"
});


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