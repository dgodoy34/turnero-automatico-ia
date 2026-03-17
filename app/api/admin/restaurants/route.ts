import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // si viene id → traer un restaurante
  if (id) {

    const { data, error } = await supabase
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
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ success:false, error:error.message });
    }

    return NextResponse.json({ success:true, restaurant:data });
  }

  // si no viene id → lista completa

  const { data, error } = await supabase
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
    `);

  if (error) {
    return NextResponse.json({ success:false, error:error.message });
  }

  return NextResponse.json({ success:true, restaurants:data });

}