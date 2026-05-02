import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const shift = searchParams.get("shift");
    const business_id = searchParams.get("business_id");

    if (!business_id || !date) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // =========================
    // 1. INVENTARIO (día específico + fallback template)
    // =========================
    let { data: inventoryData, error: invError } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("business_id", business_id)
      .or(`date.eq.${date},date.is.null`);

    if (invError) throw invError;

    if (!inventoryData) inventoryData = [];

    // =========================
    // 2. RESERVAS
    // =========================
    const { data: appts, error: apptError } = await supabase
      .from("appointments")
      .select("assigned_table_capacity, time")
      .eq("business_id", business_id)
      .eq("date", date)
      .eq("status", "confirmed");

    if (apptError) throw apptError;

    // =========================
    // 3. NORMALIZAR TURNO
    // =========================
    const normalizedShift = shift
      ? shift.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      : "";

    // =========================
    // 4. FILTRAR POR TURNO
    // =========================
    const filteredInv = inventoryData.filter((r: any) => {
      if (normalizedShift === "dia") return r.start_time <= "16:00";
      if (normalizedShift === "noche") return r.start_time > "16:00";
      return true;
    });

    const filteredAppts = (appts || []).filter((a: any) => {
      if (normalizedShift === "dia") return a.time <= "16:00";
      if (normalizedShift === "noche") return a.time > "16:00";
      return true;
    });

    // =========================
    // 🔥 5. ELIMINAR DUPLICADOS (CLAVE DEL FIX)
    // =========================
    const uniqueMap = new Map<string, number>();

    filteredInv.forEach((row: any) => {
      const key = `${row.capacity}-${row.start_time}`;

      // 👉 evitar sumar duplicados (día + template)
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, row.quantity);
      }
    });

    // =========================
    // 🔥 6. AGRUPAR POR CAPACITY
    // =========================
    const map = new Map<number, number>();

    uniqueMap.forEach((quantity, key) => {
      const capacity = Number(key.split("-")[0]);
      const current = map.get(capacity) || 0;
      map.set(capacity, current + quantity);
    });

    // =========================
    // 7. RESTAR RESERVAS
    // =========================
    filteredAppts.forEach((appt: any) => {
      const current = map.get(appt.assigned_table_capacity) || 0;
      if (current > 0) {
        map.set(appt.assigned_table_capacity, current - 1);
      }
    });

    // =========================
    // 8. RESULTADO FINAL
    // =========================
    const tables = Array.from(map.entries()).map(([capacity, quantity]) => ({
      capacity,
      quantity: Math.max(0, quantity),
    }));

    return NextResponse.json({ success: true, tables });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}