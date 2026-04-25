import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// 🔥 Resolver business_id (Soporte para Query Param, Header y Subdominio)
async function resolveBusinessId(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1️⃣ Prioridad: Query param
  let business_id = searchParams.get("business_id");
  if (business_id) return business_id;

  // 2️⃣ Header personalizado
  const headerId = req.headers.get("x-business-id");
  if (headerId) return headerId;

  // 3️⃣ Por Subdominio
  const host = req.headers.get("host");
  if (!host) return null;

  const subdomain = host.split(".")[0];

  const { data, error } = await supabase
    .from("restaurants")
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
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const shift = searchParams.get("shift"); // Recibe "Día" o "Noche"

    const business_id = await resolveBusinessId(req);

    if (!business_id) {
      return NextResponse.json(
        { success: false, error: "business_id no encontrado" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: "La fecha es requerida" },
        { status: 400 }
      );
    }

    console.log(`🔎 Buscando inventario para: ${business_id} | Fecha: ${date} | Turno: ${shift}`);

    // =========================
    // 🔥 1. OBTENER CONFIGURACIÓN
    // =========================
    // Intentamos buscar primero si hay una configuración específica para esa fecha
    let { data, error } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity, start_time")
      .eq("business_id", business_id)
      .eq("date", date);

    if (error) throw error;

    // =========================
    // 🔥 2. FALLBACK A DEFAULT
    // =========================
    // Si no hay nada para esa fecha específica, usamos los que tienen date = null (plantilla base)
    if (!data || data.length === 0) {
      console.log("⚠️ Sin config específica para la fecha → Usando DEFAULT (date: null)");
      const { data: fallback, error: fallbackError } = await supabase
        .from("restaurant_table_inventory")
        .select("capacity, quantity, start_time")
        .eq("business_id", business_id)
        .is("date", null);

      if (fallbackError) throw fallbackError;
      data = fallback;
    }

    // =========================
    // 🔥 3. FILTRO POR TURNO (ROBUSTO)
    // =========================
    let filtered = data || [];

    // Normalizamos el turno para evitar errores por acentos o mayúsculas
    const normalizedShift = shift 
      ? shift.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() 
      : "";

    if (normalizedShift === "dia") {
      // Turno día: mesas que empiezan a las 16:00 o antes
      filtered = data.filter((r: any) => r.start_time <= "16:00");
    } else if (normalizedShift === "noche") {
      // Turno noche: mesas que empiezan después de las 16:00
      filtered = data.filter((r: any) => r.start_time > "16:00");
    }

    // =========================
    // 🔥 4. AGRUPAR POR CAPACIDAD
    // =========================
    // Si tienes varios registros de "Capacidad 2", los sumamos
    const map = new Map<number, number>();

    filtered.forEach((row: any) => {
      const current = map.get(row.capacity) || 0;
      map.set(row.capacity, current + row.quantity);
    });

    const tables = Array.from(map.entries()).map(([capacity, quantity]) => ({
      capacity,
      quantity,
    }));

    console.log("✅ Mesas encontradas:", tables.length);

    return NextResponse.json({ 
      success: true, 
      tables,
      debug: { 
        count: filtered.length,
        shiftUsed: normalizedShift 
      }
    });

  } catch (err: any) {
    console.error("💥 Error Crítico en API:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}