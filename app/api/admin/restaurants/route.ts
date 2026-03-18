import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";


// =========================
// GET
// =========================

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // traer un restaurante
  if (id) {

    const { data, error } = await supabase
      .from("restaurants")
      .select(`
        id,
        name,
        slug,
        address,
        owner_name,
        phone,
        email,
        phone_number_id,
        restaurant_licenses(
          status,
          expires_at,
          subscription_plans(
            name
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({
        success:false,
        error:error.message
      });
    }

    return NextResponse.json({
      success:true,
      restaurant:data
    });
  }

  // lista completa

  const { data, error } = await supabase
    .from("restaurants")
    .select(`
      id,
      name,
      slug,
      address,
      owner_name,
      phone,
      email,
      phone_number_id,
      restaurant_licenses(
        status,
        expires_at,
        subscription_plans(
          name
        )
      )
    `);

  if (error) {
    return NextResponse.json({
      success:false,
      error:error.message
    });
  }

  return NextResponse.json({
    success:true,
    restaurants:data
  });

}


// =========================
// UPDATE RESTAURANT
// =========================

export async function PUT(req:Request){

  const body = await req.json();

  const {
    id,
    name,
    slug,
    address,
    owner_name,
    phone,
    email
  } = body;

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      slug,
      address,
      owner_name,
      phone,
      email
    })
    .eq("id",id);

  if(error){
    return NextResponse.json({
      success:false,
      error:error.message
    });
  }

  return NextResponse.json({
    success:true
  });

}


// =========================
// DELETE
// =========================

export async function DELETE(req:Request){

const { searchParams } = new URL(req.url)
const id = searchParams.get("id")

if(!id){
return NextResponse.json({success:false})
}

const { error } = await supabase
.from("restaurants")
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