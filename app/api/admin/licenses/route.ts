import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

// =========================
// GET LICENSES
// =========================

export async function GET(req:Request){

const { searchParams } = new URL(req.url)
const restaurant_id = searchParams.get("id")

let query = supabase
.from("restaurant_licenses")
.select(`
id,
status,
expires_at,
restaurants(name),
subscription_plans(
name,
max_users,
max_reservations,
price
)
`)
.order("expires_at",{ ascending:false })

if(!restaurant_id){
  return NextResponse.json({
    success:false,
    error:"restaurant_id requerido"
  })
}

query = query.eq("restaurant_id",restaurant_id)
const { data, error } = await query

if(error){
return NextResponse.json({
success:false,
error:error.message
})
}

return NextResponse.json({
success:true,
licenses:data
})

}



// =========================
// CREATE LICENSE
// =========================

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



// =========================
// DELETE LICENSE
// =========================

export async function DELETE(req:Request){

const { searchParams } = new URL(req.url)
const id = searchParams.get("id")

if(!id){
return NextResponse.json({ success:false })
}

const { error } = await supabase
.from("restaurant_licenses")
.delete()
.eq("id",id)

if(error){
return NextResponse.json({
success:false,
error:error.message
})
}

return NextResponse.json({
success:true
})

}

// =========================
// UPDATE LICENSE STATUS
// =========================

export async function PATCH(req:Request){

const body = await req.json()

const { id, status } = body

if(!id){
return NextResponse.json({success:false})
}

const { error } = await supabase
.from("restaurant_licenses")
.update({
status
})
.eq("id",id)

if(error){
return NextResponse.json({
success:false,
error:error.message
})
}

return NextResponse.json({
success:true
})

}