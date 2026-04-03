import { supabase } from "@/lib/supabaseClient";

export async function checkAvailability({
  restaurant_id,
  date,
  people,
  shift
}: {
  restaurant_id: string;
  date: string;
  people: number;
  shift: "Día" | "Noche";
}) {
  try {
    const { data } = await supabase
      .from("restaurant_table_inventory")
      .select("capacity, quantity, start_time")
      .eq("restaurant_id", restaurant_id)
      .eq("date", date);

    if (!data || data.length === 0) {
      return { available: false };
    }

    // 🔥 filtrar turno
    let filtered = data;

    if (shift === "Día") {
      filtered = data.filter(r => r.start_time <= "16:00");
    }

    if (shift === "Noche") {
      filtered = data.filter(r => r.start_time > "16:00");
    }

    // 🔥 buscar mesa que sirva
    const match = filtered.find(t => t.capacity >= people);

    if (!match) {
      return { available: false };
    }

    // 🔥 verificar cantidad disponible
    if (match.quantity <= 0) {
      return { available: false };
    }

    return {
      available: true,
      capacity: match.capacity
    };

  } catch (e) {
    console.error(e);
    return { available: false };
  }
}