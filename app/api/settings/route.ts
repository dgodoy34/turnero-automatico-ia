import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================
// 🔥 RESOLVER BUSINESS ID (FIX REAL)
// ============================
async function resolveBusinessId(req: NextRequest): Promise<string | null> {
  // 1️⃣ Query param (máxima prioridad)
  const urlBusinessId = req.nextUrl.searchParams.get("business_id");
  if (urlBusinessId) return urlBusinessId;

  // 2️⃣ Header (modo SaaS limpio)
  const headerBusinessId = req.headers.get("x-business-id");
  if (headerBusinessId) return headerBusinessId;

  // 3️⃣ Subdominio o fallback
  const host = req.headers.get("host") || "";

  const parts = host.split(".");

  // 👉 demo.turiago.app → demo
  // 👉 turiago.app → null
  const subdomain = parts.length > 2 ? parts[0] : null;

  // 🔥 fallback cuando NO hay subdominio
  const finalSlug = subdomain || "demo";

  console.log("🔎 resolveBusinessId");
  console.log("host:", host);
  console.log("subdomain:", subdomain);
  console.log("finalSlug:", finalSlug);

  const { data, error } = await supabase
    .from("restaurants")
    .select("business_id")
    .eq("slug", finalSlug)
    .single();

  if (error || !data) {
    console.error("❌ Error buscando business_id:", error);
    return null;
  }

  return data.business_id;
}

// ============================
// GET → obtener business_id
// ============================
export async function GET(req: NextRequest) {
  try {
    const businessId = await resolveBusinessId(req);

    if (!businessId) {
      return NextResponse.json(
        { error: "No se encontro el business_id" },
        { status: 404 }
      );
    }

    return NextResponse.json({ businessId });

  } catch (err: any) {
    console.error("💥 Error en settings GET:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// ============================
// POST → guardar settings
// ============================
export async function POST(req: NextRequest) {
  try {
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

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("💥 Error en settings POST:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}