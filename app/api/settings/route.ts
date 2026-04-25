import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resolveBusinessId(req: NextRequest): Promise<string | null> {
  // 1. Intentar obtener de query param
  const urlBusinessId = req.nextUrl.searchParams.get("business_id");
  if (urlBusinessId) return urlBusinessId;

  // 2. Intentar obtener de header
  const headerBusinessId = req.headers.get("x-business-id");
  if (headerBusinessId) return headerBusinessId;

  // 3. Resolver por subdomain
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];

  const { data } = await supabase
    .from("restaurants")
    .select("business_id")
    .eq("slug", subdomain)
    .single();

  return data?.business_id || null;
}

// Handler GET para obtener el business_id
export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];
  
  console.log("[DEBUG] host:", host);
  console.log("[DEBUG] subdomain:", subdomain);

  const { data, error } = await supabase
    .from("restaurants")
    .select("business_id")
    .eq("slug", subdomain)
    .single();

  console.log("[DEBUG] query result:", { data, error });

  const businessId = data?.business_id || null;

  if (!businessId) {
    return NextResponse.json(
      { error: "No se encontro el business_id", debug: { host, subdomain, data, error } },
      { status: 404 }
    );
  }

  return NextResponse.json({ businessId });
}

// Handler POST existente
export async function POST(req: NextRequest) {
  const businessId = await resolveBusinessId(req);

  if (!businessId) {
    return NextResponse.json(
      { error: "No se encontro el business_id" },
      { status: 404 }
    );
  }

  const body = await req.json();

  const { error } = await supabase
    .from("general_settings")
    .upsert(
      {
        business_id: businessId,
        ...body,
      },
      { onConflict: "business_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}