import { supabase } from "./supabaseClient";

export async function getRestaurantId(phoneNumberId: string) {

  const { data, error } = await supabase
    .from("restaurants")
    .select("business_id") // 🔥 CAMBIO CLAVE
    .eq("phone_number_id", phoneNumberId)
    .single();

  if (error || !data) {
    console.error("Error buscando business_id:", error);
    return null;
  }

  return data.business_id; // 🔥 AHORA DEVUELVE business_id
}