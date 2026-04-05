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

  // 🔥 SIMULAR WEBHOOK REAL
  const fakeWebhook = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from,
                  text: { body: text },
                  type: "text"
                }
              ]
            }
          }
        ]
      }
    ]
  };

  try {

    const baseUrl = (process.env.BASE_URL || "").replace(/\/$/, "");

    if (!baseUrl) {
      console.error("❌ BASE_URL no definida");
      return { reply: "Error configuración servidor (BASE_URL)" };
    }

    const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(fakeWebhook)
    });

    // 🔥 si el webhook falla
    if (!res.ok) {
      const textError = await res.text();
      console.error("❌ Webhook error:", textError);
      return { reply: "Error ejecutando webhook" };
    }

    // 🔥 intentar leer respuesta
    let data: any = null;

    try {
      data = await res.json();
    } catch (e) {
      // el webhook puede no devolver JSON (válido en tu caso)
      return { reply: "✔ Procesado (flujo ejecutado)" };
    }

    return {
      reply: data?.reply || "✔ Procesado (sin respuesta visible)"
    };

  } catch (error) {

    console.error("❌ Error DEBUG MODE:", error);

    return {
      reply: "Error interno en debug 😵"
    };
  }
}
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

    const session = await getSession(from);

    if (restaurant?.id) {
      await supabase
        .from("conversation_state")
        .update({ restaurant_id: restaurant.id })
        .eq("phone", from);
    }

    console.log("📩 Mensaje:", text);

    return { reply: "OK" };

  } catch (error) {
    console.error("❌ Error en restaurantHandler:", error);
    return { reply: "Error interno 😵" };
  }
}