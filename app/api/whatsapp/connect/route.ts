import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req:Request){

  const body = await req.json()

  const {
    restaurant_id,
    phone_number_id,
    waba_id,
    access_token
  } = body

  const { error } = await supabase
  .from("restaurants")
  .update({
    phone_number_id,
    whatsapp_business_account_id:waba_id,
    access_token
  })
  .eq("id", restaurant_id)

  if(error){
    return NextResponse.json({success:false})
  }

  return NextResponse.json({success:true})
}