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
  // 1️⃣ Verificar si ya tiene reserva confirmada mismo día y hora
  const { data: existing } = await supabase
    .from("reservations")
    .select("*")
    .eq("client_dni", dni)
    .eq("date", date)
    .eq("time", time)
    .eq("status", "confirmada")
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      message: "Ya tenés una reserva confirmada en ese horario.",
      existingReservation: existing,
    };
  }

  // 2️⃣ Generar código seguro
  const reservationCode = await generateReservationCode(date);

  // 3️⃣ Insertar reserva
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