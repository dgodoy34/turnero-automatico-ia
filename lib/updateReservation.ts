import { supabase } from "./supabaseClient";

export async function updateReservation({
  reservation_code,
  date,
  time,
  people,
}: {
  reservation_code: string;
  date: string;
  time: string;
  people: number;
}) {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      date,
      time,
      people,
    })
    .eq("reservation_code", reservation_code)
    .eq("status", "confirmed")
    .select()
    .single();

  if (error || !data) {
    console.error("Error actualizando reserva:", error);
    return {
      success: false,
      message: "No se pudo modificar la reserva.",
    };
  }

  return {
    success: true,
    reservation: data,
  };
}