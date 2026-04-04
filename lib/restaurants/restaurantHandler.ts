// lib/restaurant/restaurantHandler.ts

import { supabase } from "@/lib/supabaseClient"
import { getSession } from "@/lib/conversation"

export async function restaurantHandler(input: any) {
  try {

    let from: string;
    let text: string;
    let restaurant: any;

    // =========================
    // 🔥 MODO DEBUG (chat tester)
    // =========================
    if (input?.from && input?.message && input?.restaurant) {

      from = input.from;
      text = input.message;
      restaurant = input.restaurant;

    } else {

      // =========================
      // 🔥 MODO WEBHOOK (ORIGINAL)
      // =========================
      const message = input?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (!message || message.type !== "text") {
        return;
      }

      from = message.from;
      text = message.text.body.trim();

      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("phone_number_id", process.env.RESTAURANT_PHONE_ID)
        .single();

      if (!restaurantData || restaurantError) {
        console.error("❌ Restaurante no encontrado", restaurantError);
        return;
      }

      restaurant = restaurantData;

    }

    const lower = text.toLowerCase();

    const session = await getSession(from);

    // 🔥 asegurar restaurant en sesión
    if (restaurant?.id) {
      await supabase
        .from("conversation_state")
        .update({ restaurant_id: restaurant.id })
        .eq("phone", from);
    }

    let reply = "No entendí 🤔";

    // =========================
    // 👉 TU LÓGICA ACTUAL (NO TOCAR)
    // =========================

    console.log("📩 Mensaje:", text);

    // =========================
    // 🔥 DEVOLVER RESPUESTA (NUEVO)
    // =========================
    return { reply };

  } catch (error) {
    console.error("❌ Error en restaurantHandler:", error);
    return { reply: "Error interno 😵" };
  }
}