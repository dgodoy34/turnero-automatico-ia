import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// 🔥 resolver business_id (multi-tenant)
async function resolveBusinessId(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1️⃣ query param (prioridad alta)
  let business_id = searchParams.get("business_id");

  if (business_id) return business_id;

  // 2️⃣ header (opcional si usás frontend controlado)
  const headerId = req.headers.get("x-business-id");
  if (headerId) return headerId;

  // 3️⃣ subdominio (modo SaaS real)
  const host = req.headers.get("host"); // ej: demo.turiago.app
  if (!host) return null;

  const subdomain = host.split(".")[0];

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", subdomain)
    .single();

  if (error || !data) {
    console.error("❌ Error resolviendo business:", error);
    return null;
  }

  return data.id;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const shift = searchParams.get("shift");

    const business_id = await resolveBusinessId(req);

    if (!business_id) {
      return NextResponse.json(
        { success: false, error: "business_id no encontrado" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    console.log("🔥 table-inventory:", { business_id, date });

    // =========================
    // 🔥 1. CONFIG DEL DÍA
    // =========================
    let { data, error } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity, start_time")
      .eq("business_id", business_id)
      .eq("date", date);

    if (error) {
      console.error("❌ DB error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // =========================
    // 🔥 2. FALLBACK DEFAULT
    // =========================
    if (!data || data.length === 0) {
      console.log("⚠️ No hay config del día → usando DEFAULT");

      const { data: fallback, error: fallbackError } = await supabase
        .from("restaurant_table_inventory")
        .select("capacity, quantity, start_time")
        .eq("business_id", business_id)
        .is("date", null);

      if (fallbackError) {
        console.error("❌ Error fallback:", fallbackError);
        return NextResponse.json(
          { success: false, error: fallbackError.message },
          { status: 400 }
        );
      }

      data = fallback;
    }

    // =========================
    // 🔥 3. FILTRO POR TURNO
    // =========================
    let filtered = data;

    if (shift === "Día") {
      filtered = data.filter((r: any) => r.start_time <= "16:00");
    }

    if (shift === "Noche") {
      filtered = data.filter((r: any) => r.start_time > "16:00");
    }

    // =========================
    // 🔥 4. AGRUPAR CAPACIDAD
    // =========================
    const map = new Map<number, number>();

    filtered?.forEach((row: any) => {
      const current = map.get(row.capacity) || 0;
      map.set(row.capacity, current + row.quantity);
    });

    const tables = Array.from(map.entries()).map(
      ([capacity, quantity]) => ({
        capacity,
        quantity,
      })
    );

    console.log("✅ Resultado final:", tables);

    return NextResponse.json({ success: true, tables });
  } catch (err: any) {
    console.error("💥 Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}