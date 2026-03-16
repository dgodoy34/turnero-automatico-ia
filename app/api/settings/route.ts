import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(){

const { data, error } = await supabase
.from("settings")
.select("*")
.single();

if(error){
return NextResponse.json({settings:null});
}

return NextResponse.json({settings:data});

}

export async function POST(req:Request){

const body = await req.json();

const { open_time, close_time, slot_interval, reservation_duration, buffer_time } = body;

const { data, error } = await supabase
.from("settings")
.upsert({
id:1,
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

}
