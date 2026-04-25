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

    // 1. Consultar el inventario para la fecha y el comercio
    let { data, error } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (error) throw error;

    // 2. Si no hay datos para esa fecha, cargar la plantilla (date is null)
    if (!data || data.length === 0) {
      const { data: template } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("business_id", business_id)
        .is("date", null);
      data = template || [];
    }

    // 3. Filtrar por Turno (Lógica Día/Noche)
    const normalizedShift = shift 
      ? shift.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() 
      : "";

    let filtered = data;
    if (normalizedShift === "dia") {
      filtered = data.filter((r: any) => r.start_time <= "16:00");
    } else if (normalizedShift === "noche") {
      filtered = data.filter((r: any) => r.start_time > "16:00");
    }

    // 4. Agrupar por capacidad (Sumar quantity de registros iguales)
    const map = new Map<number, number>();
    filtered.forEach((row: any) => {
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