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

  // 🔎 Verificar si ya existe reserva en mismo horario
const { data: existing } = await supabase
  .from("appointments")
  .select("*")
  .eq("client_dni", dni)
  .eq("date", date)
  .eq("time", time)
  .eq("status", "confirmed")
  .maybeSingle();

if (existing) {
  return {
    success: false,
    message: "Ya tenés una reserva confirmada en ese horario.",
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