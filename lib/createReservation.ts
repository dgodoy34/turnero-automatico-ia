import { supabase } from "./supabaseClient";
import { generateReservationCode } from "./reservationCode";

type CreateReservationParams = {
  dni: string;
  date: string;
  time: string;
  people: number;
};

export async function createReservation({
  dni,
  date,
  time,
  people,
}: CreateReservationParams) {

  // Capacidad máxima fija (FASE 1)
  const MAX_CAPACITY = 60;

  // Verificar ocupación actual en ese horario
  const { data: existing } = await supabase
    .from("appointments")
    .select("people")
    .eq("date", date)
    .eq("time", time)
    .eq("status", "confirmed");

  const totalPeople =
    existing?.reduce((sum, r) => sum + (r.people || 0), 0) || 0;

  if (totalPeople + people > MAX_CAPACITY) {
    return {
      success: false,
      message: "Capacidad máxima alcanzada para ese horario.",
    };
  }

 const reservationCode = await generateReservationCode(date);

  const { data, error } = await supabase
    .from("appointments")
    .insert({
  client_dni: dni,
  date,
  time,
  people,
  service: "reserva_mesa",
  status: "confirmed",
  reservation_code: reservationCode,
})
    .select()
    .single();

  if (error) {
  console.error("❌ Supabase insert error:", error);
  return { success: false, message: error.message };
}

  return {
    success: true,
    reservation: data,
  };
}