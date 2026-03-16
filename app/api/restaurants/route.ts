import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function GET(req: Request){

try{

const restaurant_id = await getRestaurantId(
  process.env.WHATSAPP_PHONE_NUMBER_ID!
);

const { data, error } = await supabase
.from("settings")
.select("*")
.eq("restaurant_id", restaurant_id)
.single();

if(error){
return NextResponse.json({settings:null});
}

return NextResponse.json({settings:data});

}catch(err:any){

return NextResponse.json(
{ error: err.message },
{ status:500 }
);

}

}

export async function POST(req:Request){

try{

const restaurant_id = await getRestaurantId(
  process.env.WHATSAPP_PHONE_NUMBER_ID!
);

const body = await req.json();

const { open_time, close_time, slot_interval, reservation_duration, buffer_time } = body;

const { error } = await supabase
.from("settings")
.upsert({
restaurant_id,
open_time,
close_time,
slot_interval,
reservation_duration,
buffer_time
});

if(error){
return NextResponse.json({success:false,error:error.message});
}

return NextResponse.json({success:true});

}catch(err:any){

return NextResponse.json(
{ success:false,error:err.message },
{ status:500 }
);

}

}