import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET(){

const { data, error } = await supabase
.from("subscription_plans")
.select("*")

if(error){
return NextResponse.json({
success:false,
error:error.message
})
}

return NextResponse.json({
success:true,
plans:data
})

}