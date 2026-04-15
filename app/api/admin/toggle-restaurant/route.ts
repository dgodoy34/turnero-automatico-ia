import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { id, active } = await req.json();

  await supabase
    .from("restaurants")
    .update({ active })
    .eq("id", id);

  return NextResponse.json({ success: true });
}