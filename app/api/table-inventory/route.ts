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

    // 1. Obtener la capacidad TOTAL (Config diaria o Plantilla)
    let { data: inventoryData, error: invError } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (invError) throw invError;

    if (!inventoryData || inventoryData.length === 0) {
      const { data: template } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("business_id", business_id)
        .is("date", null);
      inventoryData = template || [];
    }

    // 2. Obtener las RESERVAS del día para saber qué está ocupado
    const { data: appts, error: apptError } = await supabase
      .from("appointments")
      .select("assigned_table_capacity, time")
      .eq("business_id", business_id)
      .eq("date", date)
      .eq("status", "confirmed");

    if (apptError) throw apptError;

    // 3. Normalizar el turno
    const normalizedShift = shift 
      ? shift.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() 
      : "";

    // 4. FILTRADO POR TURNO: Aplicar la misma lógica horaria a ambos
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

    // 5. CÁLCULO: (Total de mesas) - (Reservas del turno)
    const map = new Map<number, number>();
    
    // Sumamos capacidad total configurada
    filteredInv.forEach((row: any) => {
      const current = map.get(row.capacity) || 0;
      map.set(row.capacity, current + row.quantity);
    });

    // Restamos cada reserva que ya existe
    filteredAppts.forEach((appt: any) => {
      const current = map.get(appt.assigned_table_capacity) || 0;
      if (current > 0) {
        map.set(appt.assigned_table_capacity, current - 1);
      }
    });

    const tables = Array.from(map.entries()).map(([capacity, quantity]) => ({
      capacity,
      quantity: Math.max(0, quantity), 
    }));

    return NextResponse.json({ success: true, tables });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}