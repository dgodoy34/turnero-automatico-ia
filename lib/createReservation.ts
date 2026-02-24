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
      console.error("Insert error:", error);
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