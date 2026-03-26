import { supabase } from "@/lib/supabaseClient"

export async function checkAvailability({
  checkIn,
  checkOut,
  roomType
}: any) {

  // 🔹 total habitaciones
  const { data: inventory } = await supabase
    .from("room_inventory")
    .select("quantity")
    .eq("room_type", roomType)
    .single()

  const total = inventory?.quantity || 0

  // 🔹 reservas existentes en rango
  const { data: bookings } = await supabase
    .from("hotel_bookings")
    .select("*")
    .eq("room_type", roomType)
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)

  const reserved = bookings?.length || 0

  return {
    available: total - reserved,
    total,
    reserved
  }
}