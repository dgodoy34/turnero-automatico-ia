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

    // 1. Intentar traer la configuración ESPECÍFICA para esa fecha
    let { data, error } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (error) throw error;

    // 2. SI NO HAY específica, recién ahí cargar la plantilla general
    // Importante: No se deben mezclar. O es específica o es plantilla.
    if (!data || data.length === 0) {
      const { data: template, error: templateError } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("business_id", business_id)
        .is("date", null);
      
      if (templateError) throw templateError;
      data = template || [];
    }

    // 3. Normalizar turno
    const normalizedShift = shift 
      ? shift.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() 
      : "";

    // 4. Filtrar por Turno (Día/Noche)
    let filtered = data;
    if (normalizedShift === "dia") {
      filtered = data.filter((r: any) => r.start_time <= "16:00");
    } else if (normalizedShift === "noche") {
      filtered = data.filter((r: any) => r.start_time > "16:00");
    }

    // 5. Agrupar por capacidad (Asegurarse de no duplicar registros)
    const map = new Map<number, number>();
    filtered.forEach((row: any) => {
      // Si hay múltiples registros de la misma capacidad para el mismo turno, se suman
      const current = map.get(row.capacity) || 0;
      map.set(row.capacity, current + row.quantity);
    });

    const tables = Array.from(map.entries()).map(([capacity, quantity]) => ({
      capacity,
      quantity,
    }));

    return NextResponse.json({ success: true, tables });

  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}