// lib/restaurant/restaurantHandler.ts

import { supabase } from "@/lib/supabaseClient"
import { getSession } from "@/lib/conversation"

export async function restaurantHandler(body: any) {
  try {
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return;
    }

    const from = message.from;
    const text = message.text.body.trim();
    const lower = text.toLowerCase();

    const session = await getSession(from);

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("phone_number_id", process.env.RESTAURANT_PHONE_ID) // 👈 CAMBIO ACÁ
      .single();

    // 🔴 VALIDAR PRIMERO
    if (!restaurant || restaurantError) {
      console.error("❌ Restaurante no encontrado", restaurantError);
      return;
    }

    // ✅ RECIÉN ACÁ LO USÁS
    await supabase
      .from("conversation_state")
      .update({ restaurant_id: restaurant.id })
      .eq("phone", from);

    let reply = "No entendí 🤔";

    // 👉 ACÁ PEGÁS TODO TU CÓDIGO ACTUAL
    // (NO CAMBIES NADA DE LO QUE YA FUNCIONA)

    console.log("📩 Mensaje:", text);

  } catch (error) {
    console.error("❌ Error en restaurantHandler:", error);
  }
}