import { supabase } from "./supabaseClient";
import { generateReservationCode } from "./reservationCode";

type CreateReservationParams = {
  dni: string;
  date: string;
  time: string;
  people: number;
  notes?: string;
};

export async function createReservation({
  dni,
  date,
  time,
  people,
  notes,
}: CreateReservationParams) {

  // 🔹 Generar código seguro
  const reservationCode = await generateReservationCode(date);

  // 🔹 Insertar reserva (sin validación de conflicto)
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      reservation_code: reservationCode,
      client_dni: dni,
      date,
      time,
      people,
      notes,
      status: "confirmada",
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Error creando la reserva");
  }

  return {
    success: true,
    reservation: data,
  };
}