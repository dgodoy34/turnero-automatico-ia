import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// =========================
// 🔥 RESOLVER BUSINESS ID
// =========================
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

  // CORREGIDO: usar tabla "restaurants" y campo "business_id"
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
// =========================
// GET
// =========================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const business_id = await resolveBusinessId(req);

    if (!date || !business_id) {
      return NextResponse.json(
        { success: false, error: "Missing params" },
        { status: 400 }
      );
    }

    console.log("👉 DATE:", date);
    console.log("👉 BUSINESS:", business_id);

    // 🔥 RESERVAS
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    // 🔥 INVENTARIO
    const { data: inventory } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity")
      .eq("business_id", business_id)
      .eq("date", date);

    // 🔥 SCHEDULE
    const { data: schedules } = await supabase
      .from("restaurant_table_schedule")
      .select("start_time, end_time")
      .eq("business_id", business_id)
      .eq("date", date);

    return NextResponse.json({
      success: true,
      schedule: schedules || [],
      tables: inventory || [],
      appointments: appointments || [],
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}