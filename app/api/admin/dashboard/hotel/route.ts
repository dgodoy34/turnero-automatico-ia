import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function GET() {

  try {

    const businessId = await getRestaurantId(
      process.env.WHATSAPP_PHONE_NUMBER_ID!
    );

    // 🔹 total reservas
    const { count: totalBookings } = await supabase
      .from("hotel_bookings")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId);

    // 🔹 hoy
    const today = new Date().toISOString().split("T")[0];

    const { count: todayBookings } = await supabase
      .from("hotel_bookings")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("check_in", today);

    // 🔹 últimas
    const { data: latest } = await supabase
      .from("hotel_bookings")
      .select("*")
      .eq("business_id", businessId)
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