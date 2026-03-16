import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req:Request){

try{

const body = await req.json()

const { restaurant_id, plan_id, months } = body

if(!restaurant_id || !plan_id){
return NextResponse.json({
success:false,
error:"restaurant_id y plan_id son requeridos"
})
}

const expires = new Date()
expires.setMonth(expires.getMonth() + (months || 1))

const { error } = await supabase
.from("restaurant_licenses")
.insert({
restaurant_id,
plan_id,
status:"active",
expires_at:expires
})

if(error){
return NextResponse.json({
success:false,
error:error.message
})
}

return NextResponse.json({
success:true
})

}catch(err:any){

return NextResponse.json({
success:false,
error:err.message
})

}

}