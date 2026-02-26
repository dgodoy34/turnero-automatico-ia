import { supabase } from "./supabaseClient";

export async function generateReservationCode(
  restaurantId: string,
  date: string
) {
  if (!restaurantId || !date) {
    throw new Error("Datos inválidos para generar código");
  }

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    throw new Error("Formato de fecha incorrecto");
  }

  const yearFull = parsedDate.getUTCFullYear();
  const yearShort = yearFull.toString().slice(-2);

  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getUTCDate()).padStart(2, "0");

  // 🔹 Obtener branch_code
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("branch_code")
    .eq("id", restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    throw new Error("No se pudo obtener branch_code");
  }

  const branchCode = String(restaurant.branch_code).padStart(3, "0");

  // 🔹 Contador GLOBAL por sucursal
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", "confirmed");

  if (error) {
    throw new Error("No se pudo generar correlativo");
  }

  const nextNumber = (count ?? 0) + 1;
  const sequential = String(nextNumber).padStart(4, "0");

  return `RC-${branchCode}-${yearShort}-${month}${day}-${sequential}`;
}