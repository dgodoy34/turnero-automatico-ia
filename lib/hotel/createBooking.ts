import { supabase } from "@/lib/supabaseClient"

export async function createBooking({
  phone,
  checkIn,
  checkOut,
  guests,
  roomType
}: any) {

  const { data, error } = await supabase
    .from("hotel_bookings")
    .insert({
        business_id,
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