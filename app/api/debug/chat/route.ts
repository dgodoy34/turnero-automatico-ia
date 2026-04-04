import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// 🔥 IMPORTANTE: elegís qué restaurant testear
const TEST_RESTAURANT_ID = "PONÉ_ACÁ_EL_ID";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    const from = body.from || "TEST_USER";

    // 🔥 simulamos estructura de webhook
    const fakeReq = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from,
                    text: { body: message }
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    // 👉 BUSCAR RESTAURANTE DIRECTO
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", TEST_RESTAURANT_ID)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" });
    }

    // 🔥 acá llamás tu lógica principal
    // IMPORTANTE: esto depende de cómo tengas armado tu webhook handler

    const response = await fetch(`${process.env.BASE_URL}/api/whatsapp/webhook`, {
      method: "POST",
      body: JSON.stringify(fakeReq)
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}