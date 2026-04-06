import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {

  try {

    // 🔹 total reservas hotel
    const { count: totalBookings } = await supabase
      .from("hotel_bookings")
      .select("*", { count: "exact", head: true });

    // 🔹 reservas hoy
    const today = new Date().toISOString().split("T")[0];

    const { count: todayBookings } = await supabase
      .from("hotel_bookings")
      .select("*", { count: "exact", head: true })
      .eq("check_in", today);

    // 🔹 últimas reservas
    const { data: latest } = await supabase
      .from("hotel_bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      totalBookings,
      todayBookings,
      latest
    });

  } catch (err: any) {

    return NextResponse.json({
      success: false,
      error: err.message
    });

  }

}