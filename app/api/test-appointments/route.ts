import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
