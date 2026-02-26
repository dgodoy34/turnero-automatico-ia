import { supabase } from "./supabaseClient";

export async function generateReservationCode(date: string) {
  try {
    // 🔹 Validación básica
    if (!date) {
      throw new Error("Fecha inválida para generar código");
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      throw new Error("Formato de fecha incorrecto");
    }

    // 🔹 Extraer partes de fecha sin problemas de timezone
    const yearFull = parsedDate.getUTCFullYear();
    const yearShort = yearFull.toString().slice(-2);

    const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getUTCDate()).padStart(2, "0");

    const dayKey = `${yearFull}-${month}-${day}`;

    // 🔹 Contar SOLO reservas confirmadas ese día
   const { count, error } = await supabase
  .from("appointments")
  .select("id", { count: "exact", head: true })
  .eq("date", dayKey)
.eq("status", "confirmed");

    if (error) {
      console.error("Error counting reservations:", error);
      throw new Error("No se pudo generar el código de reserva");
    }

    const nextNumber = (count ?? 0) + 1;
    const sequential = String(nextNumber).padStart(4, "0");

    return `RC-${yearShort}-${month}${day}-${sequential}`;

  } catch (err) {
    console.error("generateReservationCode error:", err);
    throw err;
  }
}