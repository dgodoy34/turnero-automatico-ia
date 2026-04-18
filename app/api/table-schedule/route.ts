import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const mode = searchParams.get("mode") || "night"; // day | night

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Missing date" },
        { status: 400 }
      );
    }

    const business_id = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    console.log("👉 DATE:", date);
    console.log("👉 MODE:", mode);

    // 🔥 1. INVENTORY (stock base)
    const { data: inventory, error: invError } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (invError) throw invError;

    // 🔥 2. APPOINTMENTS (reservas reales)
    const { data: appointments, error: appError } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (appError) throw appError;

    console.log("📦 INVENTORY:", inventory?.length);
    console.log("📅 APPOINTMENTS:", appointments?.length);

    // 🔥 3. FILTRAR POR TURNO
    const filteredAppointments = (appointments || []).filter((a) => {
      const time = a.time || a.hour || a.start_time; // ajustá según tu DB

      if (!time) return false;

      if (mode === "day") {
        return time >= "12:00" && time <= "16:00";
      }

      if (mode === "night") {
        return time >= "20:00" || time <= "02:00";
      }

      return true;
    });

    // 🔥 4. CONTAR OCUPACIÓN POR CAPACIDAD
    const occupiedByCapacity: Record<number, number> = {};

    for (const appt of filteredAppointments) {
      const people = appt.people || appt.party_size || 0;

      let tableSize = 2;
      if (people <= 2) tableSize = 2;
      else if (people <= 4) tableSize = 4;
      else tableSize = 6;

      occupiedByCapacity[tableSize] =
        (occupiedByCapacity[tableSize] || 0) + 1;
    }

    // 🔥 5. ARMAR RESULTADO FINAL
    const result = (inventory || []).map((inv) => {
      const total = inv.quantity;
      const capacity = inv.capacity;

      const occupied = occupiedByCapacity[capacity] || 0;
      const available = Math.max(total - occupied, 0);

      return {
        capacity,
        total,
        occupied,
        available,
      };
    });

    return NextResponse.json({
      success: true,
      source: "computed",
      schedule: result,
      rawAppointments: filteredAppointments, // debug útil
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}