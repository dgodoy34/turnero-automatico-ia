import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

// =========================
// HELPERS
// =========================

function generateSlug(name:string){
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g,"-")
    .replace(/[^a-z0-9-]/g,"")
}

function generateBranchCode(name:string){
  return generateSlug(name) + "-" + Math.floor(Math.random()*1000)
}


// =========================
// GET
// =========================

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {

    const { data, error } = await supabase
      .from("restaurants")
      .select(`
        id,
        name,
        slug,
        branch_code,
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

  const { data, error } = await supabase
    .from("restaurants")
    .select(`
      id,
      name,
      slug,
      branch_code,
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
// CREATE RESTAURANT
// =========================

export async function POST(req:Request){

  try{

    const body = await req.json();

    const { name, address, owner_name, phone, email } = body;

    if(!name){
      return NextResponse.json({
        success:false,
        error:"Nombre requerido"
      });
    }

    const slug = generateSlug(name);
    const branch_code = generateBranchCode(name);

    const { error } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        branch_code,
        address,
        owner_name,
        phone,
        email
      });

    if(error){
      return NextResponse.json({
        success:false,
        error:error.message
      });
    }

    return NextResponse.json({
      success:true
    });

  }catch(err:any){
    return NextResponse.json({
      success:false,
      error:err.message
    });
  }

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

  const newSlug = slug || generateSlug(name);

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      slug: newSlug,
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