import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

async function resolveBusinessId(req: Request) {
  const host = req.headers.get("host");

  if (!host) return null;

  const subdomain = host.split(".")[0];

  const { data, error } = await supabase
    .from("restaurants")
    .select("business_id")
    .eq("slug", subdomain)
    .single();

  if (error || !data) return null;

  return data.business_id;
}

export async function GET(req: Request) {
  try {
    const business_id = await resolveBusinessId(req);

    if (!business_id) {
      return NextResponse.json(
        { settings: null, business_id: null },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("business_id", business_id)
      .single();

    if (error) {
      return NextResponse.json({
        settings: null,
        business_id
      });
    }

    // 🔥 CLAVE: DEVOLVER business_id
    return NextResponse.json({
      settings: data,
      business_id
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}