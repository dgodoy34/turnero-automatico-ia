import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export const dynamic = "force-dynamic"

export async function GET(){

const {data,error} = await supabase
.from("restaurants")
.select(`
id,
name,
restaurant_licenses(
status,
expires_at,
subscription_plans(
name
)
)
`)

if(error){
return NextResponse.json({
success:false,
error:error.message
})
}

return NextResponse.json({
success:true,
restaurants:data
})

}