import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {

  try {

    // 🔹 total negocios (por ahora restaurants)
    const { count: totalBusinesses } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true });

    // 🔹 total reservas
    const { count: totalReservations } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true });

    // 🔹 reservas hoy
    const today = new Date().toISOString().split("T")[0];

    const { count: todayReservations } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("date", today);

    // =========================
    // 🔥 TOP NEGOCIO
    // =========================

    const { data: top } = await supabase
      .from("appointments")
      .select("business_id")
      .limit(1000);

    let topBusiness = null;

    if (top) {

      const counts: any = {};

      top.forEach((r: any) => {
        counts[r.business_id] = (counts[r.business_id] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);

      if (sorted.length > 0) {

        const topId = sorted[0][0];

        const { data } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", topId)
          .single();

        topBusiness = data?.name;

      }

    }

    // =========================
    // 🔥 STATS POR NEGOCIO
    // =========================

    const { data: reservations } = await supabase
      .from("appointments")
      .select("business_id, client_dni");

    const statsByBusiness: any = {};

    if (reservations) {

      reservations.forEach((r: any) => {

        if (!statsByBusiness[r.business_id]) {
          statsByBusiness[r.business_id] = {
            total_reservations: 0,
            unique_clients: new Set()
          };
        }

        statsByBusiness[r.business_id].total_reservations++;
        statsByBusiness[r.business_id].unique_clients.add(r.client_dni);

      });

    }

    const formattedStats: any[] = Object.entries(statsByBusiness).map(([id, data]: any) => ({
      business_id: id,
      total_reservations: data.total_reservations,
      unique_clients: data.unique_clients.size
    }));

    // 🔥 traer nombres (FIX IMPORTANTE)
    for (let stat of formattedStats) {

      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", stat.business_id) // 🔥 FIX CLAVE
        .single();

      stat.name = data?.name || "Sin nombre";

    }

    return NextResponse.json({
  success: true,
  totalRestaurants: totalBusinesses, // 🔥 FIX
  totalReservations,
  todayReservations,
  topRestaurant: topBusiness, // 🔥 FIX
  restaurantStats: formattedStats // 🔥 FIX
});

  } catch (err: any) {

    return NextResponse.json({
      success: false,
      error: err.message
    });

  }

}