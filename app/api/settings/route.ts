import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

async function resolveBusinessId(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1️⃣ query param
  let business_id = searchParams.get("business_id");
  if (business_id) return business_id;

  // 2️⃣ header
  const headerId = req.headers.get("x-business-id");
  if (headerId) return headerId;

  // 3️⃣ subdominio
  const host = req.headers.get("host");
  if (!host) return null;

  const subdomain = host.split(".")[0];

  const { data, error } = await supabase
    .from("restaurants") // ✅ TU TABLA
    .select("business_id")
    .eq("slug", subdomain)
    .single();

  if (error || !data) {
    console.error("❌ Error resolviendo business:", error);
    return null;
  }

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
      .maybeSingle(); // 🔥 mejor que single()

    if (error) {
      console.error("❌ Settings error:", error);
      return NextResponse.json({
        settings: null,
        business_id
      });
    }

    return NextResponse.json({
      settings: data,
      business_id
    });

  } catch (err: any) {
    console.error("💥 Settings API error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}