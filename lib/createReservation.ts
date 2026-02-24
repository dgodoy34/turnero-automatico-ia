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

  try {

    // 🔎 Verificar si ya existe misma reserva para ese DNI
    const { data: existing } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_dni", dni)
      .eq("date", date)
      .eq("time", time)
      .eq("status", "Confirmado")
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        existingReservation: existing,
      };
    }

    // 🏷 Generar código
    const reservationCode = await generateReservationCode(date);

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        client_dni: dni,
        date,
        time,
        service: "Mesa",
        notes: notes ?? null,
        status: "Confirmado",
        reservation_code: reservationCode,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return { success: false };
    }

    return {
      success: true,
      reservation: data,
    };

  } catch (err) {
    console.error("createReservation crash:", err);
    return { success: false };
  }
}