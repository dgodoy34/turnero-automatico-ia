import { supabase } from "./supabaseClient";

export async function getSession(phone: string) {
  const { data } = await supabase
    .from("conversation_state")
    .select("*")
    .eq("phone", phone)
    .single();

  if (!data) {
    const { data: created } = await supabase
      .from("conversation_state")
      .insert({ phone })
      .select()
      .single();

    return created;
  }

  return data;
}

export async function setState(phone: string, state: string) {
  await supabase
    .from("conversation_state")
    .update({ state, updated_at: new Date().toISOString() })
    .eq("phone", phone);
}

export async function setDNI(phone: string, dni: string) {
  await supabase
    .from("conversation_state")
    .update({ dni })
    .eq("phone", phone);
}

export async function setTemp(phone: string, temp: any) {
  await supabase
    .from("conversation_state")
    .update({ temp_data: temp })
    .eq("phone", phone);
}