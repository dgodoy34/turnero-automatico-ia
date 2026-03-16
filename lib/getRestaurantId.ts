import { supabase } from "./supabaseClient";

export async function getRestaurantId(phoneNumberId: string) {

  const { data, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("phone_number_id", phoneNumberId)
    .single();

  if (error) {
    console.error("Error buscando restaurante:", error);
    return null;
  }

  return data?.id || null;
}