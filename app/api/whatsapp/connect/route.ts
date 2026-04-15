import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req: Request) {

  const body = await req.json()

  const {
    business_id,
    phone_number_id,
    waba_id,
    access_token,
    phone,
    name
  } = body

  const { error } = await supabase
    .from("whatsapp_accounts")
    .insert({
      business_id,
      phone_number_id,
      waba_id,
      access_token,
      phone,
      name,
      is_active: true
    })

  if (error) {
    console.error("❌ Error conectando WhatsApp:", error)
    return NextResponse.json({ success: false })
  }

  return NextResponse.json({ success: true })
}