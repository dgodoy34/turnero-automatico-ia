import { supabase } from "./supabaseClient";

export async function generateReservationCode(date: string) {
  const parsedDate = new Date(date);

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  const dayKey = `${year}-${month}-${day}`;

  // contar reservas del mismo día
  const { count } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("date", dayKey);

  const nextNumber = (count ?? 0) + 1;

  const sequential = String(nextNumber).padStart(3, "0");

  return `RC-${year}-${month}${day}-${sequential}`;
}