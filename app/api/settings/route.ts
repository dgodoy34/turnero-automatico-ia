import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

async function resolveBusinessId(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1. query param
  let business_id = searchParams.get("business_id");
  if (business_id) return business_id;

  // 2. header
  const headerId = req.headers.get("x-business-id");
  if (headerId) return headerId;

  // 3. subdominio
  const host = req.headers.get("host");
  if (!host) return null;

  const subdomain = host.split(".")[0];

  const { data, error } = await supabase
    .from("restaurants")
    .select("business_id")
    .eq("slug", subdomain)
    .single();

  if (error || !data) {
    console.error("Error resolviendo business:", error);
    return null;
  }

  return data.business_id;
}

export async function GET(req: Request) {
  try {
    const business_id = await resolveBusinessId(req);

    if (!business_id) {
      return NextResponse.json(
        { error: "No se encontro el business_id" },
        { status: 404 }
      );
    }

    return NextResponse.json({ businessId: business_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const business_id = body.business_id;

    if (!business_id) {
      return NextResponse.json({ error: "Missing business_id" }, { status: 400 });
    }

    const payload = {
      business_id,
      duration_small: body.duration_small,
      duration_medium: body.duration_medium,
      duration_large: body.duration_large,
      slot_interval: body.slot_interval,
    };

    const { data, error } = await supabase
      .from("settings")
      .upsert(payload, {
        onConflict: "business_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving settings:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, settings: data });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
