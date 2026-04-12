import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function GET() {
  try {
    const today = new Date();

    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const { data: clients, error } = await supabase
      .from("clients")
      .select("name, phone, birthday")
      .not("phone", "is", null);

    if (error) throw error;

    let sent = 0;

    for (const c of clients || []) {

      if (!c.birthday) continue;

      const b = new Date(c.birthday);
      const bMonth = String(b.getMonth() + 1).padStart(2, "0");
      const bDay = String(b.getDate()).padStart(2, "0");

      if (bMonth === month && bDay === day) {

        const message = `🎉 ¡Feliz cumpleaños ${c.name || ""}! 🥳

Te regalamos un 🎁:
👉 10% OFF en tu próxima reserva

¿Querés venir hoy o reservar? 😉`;

        try {
          await sendWhatsAppMessage(c.phone, message);
          sent++;
        } catch (err) {
          console.error("ERROR CUMPLE:", c.phone, err);
        }
      }
    }

    console.log("BIRTHDAYS:", sent);

    return NextResponse.json({ ok: true, sent });

  } catch (err) {
    console.error("BIRTHDAY CRON ERROR:", err);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}