import { supabase } from "./supabaseClient";

// ==========================
// 🧠 GET SESSION
// ==========================
export async function getSession(phone: string) {
  const { data } = await supabase
    .from("conversation_state")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

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

// ==========================
// 🔄 SET STATE
// ==========================
export async function setState(phone: string, state: string) {
  await supabase
    .from("conversation_state")
    .upsert({
      phone,
      state,
      updated_at: new Date().toISOString(),
    });
}

// ==========================
// 🆔 SET DNI
// ==========================
export async function setDNI(phone: string, dni: string) {
  await supabase
    .from("conversation_state")
    .upsert({
      phone,
      dni,
      updated_at: new Date().toISOString(),
    });
}

// ==========================
// 🧠 SET TEMP DATA (merge seguro)
// ==========================
export async function setTemp(phone: string, temp: any) {
  const { data: existing } = await supabase
    .from("conversation_state")
    .select("temp_data")
    .eq("phone", phone)
    .maybeSingle();

  const mergedTemp = {
    ...(existing?.temp_data || {}),
    ...temp,
  };

  // Agregamos un timestamp para ayudar con concurrencia
  const { error } = await supabase
    .from("conversation_state")
    .upsert({
      phone,
      temp_data: mergedTemp,
      updated_at: new Date().toISOString(),
    });

  if (error) console.error("Error setTemp:", error);
}
// ==========================
// 🧹 CLEAR TEMP (RECOMENDADO)
// ==========================
export async function clearTemp(phone: string) {
  await supabase
    .from("conversation_state")
    .upsert({
      phone,
      temp_data: {},
      updated_at: new Date().toISOString(),
    });
}