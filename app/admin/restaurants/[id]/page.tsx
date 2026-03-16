import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET(
req:Request,
{params}:{params:{id:string}}
){

const {data,error} = await supabase
.from("restaurants")
.select(`
id,
name,
phone_number_id,
restaurant_users(
id
),
restaurant_licenses(
status,
expires_at,
subscription_plans(
name
)
)
`)
.eq("id",params.id)
.single()

if(error){

return NextResponse.json({
success:false,
error:error.message
})

}

return NextResponse.json({
success:true,
restaurant:data
})

}