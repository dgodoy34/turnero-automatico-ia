import { supabase } from "@/lib/supabaseClient"
import { checkAvailability } from "./checkAvailability"

export async function createBooking({
  business_id,
  phone,
  checkIn,
  checkOut,
  guests,
  roomType
}: any) {

  // 🔒 VALIDACIÓN FINAL (clave)
  const availability = await checkAvailability({
    business_id,
    checkIn,
    checkOut,
    roomType
  })

  if (availability.available <= 0) {
    return {
      success: false,
      message: "No hay disponibilidad"
    }
  }

  const { data, error } = await supabase
    .from("hotel_bookings")
    .insert({
      business_id,
      phone,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      room_type: roomType
    })
    .select()
    .single()

  if (error) {
    console.error("❌ ERROR BOOKING:", error)
    return { success: false }
  }

  return {
    success: true,
    booking: data
  }
}