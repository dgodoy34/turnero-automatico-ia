import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {

  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .limit(1)
    .single();

  if (error) {

    return NextResponse.json(
      { success:false, error:error.message },
      { status:500 }
    );

  }

  return NextResponse.json({
    success:true,
    restaurant:data
  });

}