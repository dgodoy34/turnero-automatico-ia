import { supabase } from "./supabaseClient";

export async function getSession(phone: string) {
  const { data } = await supabase
    .from("conversation_state")
    .select("*")
    .eq("phone", phone)
    .maybeSingle(); // 🔥 CAMBIO CLAVE

  if (!data) {
    const { data: created } = await supabase
      .from("conversation_state")
      .insert({
  phone,
  state: "INIT",
  temp_data: {},
})
      .select()
      .single();

    return created;
  }

  return data;
}

export async function setState(phone: string, state: string) {
  await supabase
    .from("conversation_state")
    .upsert({
      phone,
      state,
      updated_at: new Date().toISOString(),
    });
}

export async function setDNI(phone: string, dni: string) {
  await supabase
    .from("conversation_state")
    .upsert({
      phone,
      dni,
    });
}

export async function setTemp(phone: string, temp: any) {
  await supabase
    .from("conversation_state")
    .upsert({
      phone,
      temp_data: temp,
    });
}