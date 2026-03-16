import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
){

  const { id } = await context.params;

  const { data, error } = await supabase
    .from("restaurants")
    .select(`
      *,
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

  if(error){

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



export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
){

  const { id } = await context.params;

  const body = await req.json();

  const { data, error } = await supabase
    .from("restaurants")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if(error){

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