import { supabase } from "@/lib/supabaseClient"

export async function checkAvailability({
  business_id,
  checkIn,
  checkOut,
  roomType
}: any) {

  // 🔹 inventario del hotel
  const { data: inventory } = await supabase
    .from("room_inventory")
    .select("quantity")
    .eq("business_id", business_id)
    .eq("room_type", roomType)
    .single()

  const total = inventory?.quantity || 0

  // 🔹 reservas solapadas (CLAVE)
  const { data: bookings } = await supabase
    .from("hotel_bookings")
    .select("*")
    .eq("business_id", business_id)
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