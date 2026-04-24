import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function POST(req: Request) {
  try {
    // 🔥 es business_id
    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    const { date, time, people } = await req.json();

    // =========================
    // 1️⃣ INVENTARIO
    // =========================
    const { data: tables } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity,quantity")
      .eq("business_id", business_id);

    // =========================
    // 2️⃣ RESERVAS DEL DÍA
    // =========================
    const { data: appointments } = await supabase
      .from("appointments")
      .select(
        "assigned_table_capacity,tables_used,start_time,end_time"
      )
      .eq("business_id", business_id)
      .eq("date", date)
      .eq("status", "confirmed");

    // =========================
    // 3️⃣ CAPACIDAD NECESARIA
    // =========================
    let neededCapacity = 2;

    if (people <= 2) neededCapacity = 2;
    else if (people <= 4) neededCapacity = 4;
    else neededCapacity = 6;

    // =========================
    // 4️⃣ TIPO DE MESA
    // =========================
    const tableType = tables?.find(
      (t) => t.capacity === neededCapacity
    );

    if (!tableType) {
      return NextResponse.json({ available: false });
    }

    const totalTables = tableType.quantity;

    // =========================
// 5️⃣ OCUPACIÓN REAL (SIN SOBREVENTA)
// =========================
let used = 0;
const requestedTime = time; // ej: "20:00"

appointments?.forEach((a) => {
  if (a.assigned_table_capacity !== neededCapacity) return;

  // Lógica de solapamiento real:
  // Una mesa está ocupada si la hora pedida está EN MEDIO de una reserva existente
  // O si la reserva existente empieza justo cuando la anterior no terminó.
  
  const isOverlapping = (requestedTime >= a.start_time && requestedTime < a.end_time);

  if (isOverlapping) {
    used += a.tables_used || 1;
  }
});
    // =========================
    // 6️⃣ DISPONIBILIDAD
    // =========================
    const freeTables = totalTables - used;

    return NextResponse.json({
      available: freeTables > 0,
      free_tables: freeTables,
    });
  } catch (error) {
    console.error("check-availability error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}