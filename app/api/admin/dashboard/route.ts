import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {

  try {

    // 🔹 total restaurantes
    const { count: totalRestaurants } = await supabase
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

    // 🔹 top restaurante
    const { data: top } = await supabase
      .from("appointments")
      .select("restaurant_id")
      .limit(1000);

    let topRestaurant = null;

    if (top) {
      const counts: any = {};

      top.forEach((r: any) => {
        counts[r.restaurant_id] = (counts[r.restaurant_id] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);

      if (sorted.length > 0) {
        const topId = sorted[0][0];

        const { data } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", topId)
          .single();

        topRestaurant = data?.name;
      }
    }

    // =========================
    // 🔥 RESERVAS POR RESTAURANTE
    // =========================

    const { data: reservations } = await supabase
      .from("appointments")
      .select("restaurant_id, client_dni");

    const statsByRestaurant: any = {};

    if (reservations) {

      reservations.forEach((r: any) => {

        if (!statsByRestaurant[r.restaurant_id]) {
          statsByRestaurant[r.restaurant_id] = {
            total_reservations: 0,
            unique_clients: new Set()
          };
        }

        statsByRestaurant[r.restaurant_id].total_reservations++;
        statsByRestaurant[r.restaurant_id].unique_clients.add(r.client_dni);

      });

    }

    // 👉 tipado flexible para evitar errores TS
    const formattedStats: any[] = Object.entries(statsByRestaurant).map(([id, data]: any) => ({
      restaurant_id: id,
      total_reservations: data.total_reservations,
      unique_clients: data.unique_clients.size
    }));

    // 🔥 traer nombres
    for (let stat of formattedStats) {

      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", stat.restaurant_id)
        .single();

      stat.name = data?.name || "Sin nombre";

    }

    return NextResponse.json({
      success: true,
      totalRestaurants,
      totalReservations,
      todayReservations,
      topRestaurant,
      restaurantStats: formattedStats // 🔥 PRO
    });

  } catch (err: any) {

    return NextResponse.json({
      success: false,
      error: err.message
    });

  }

}