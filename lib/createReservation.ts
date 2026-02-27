import { supabase } from "./supabaseClient";
import { generateReservationCode } from "./reservationCode";

type CreateReservationParams = {
  dni: string;
  date: string;
  time: string;
  people: number;
};

export async function createReservation({
  dni,
  date,
  time,
  people,
}: CreateReservationParams) {
  try {
    // =========================
    // 1️⃣ Obtener configuración del restaurante
    // =========================
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .limit(1)
      .single();

    if (restaurantError || !restaurant) {
      return { success: false, message: "Restaurante no configurado." };
    }

    // =========================
    // 2️⃣ Capacidad base + override diario
    // =========================
    let MAX_CAPACITY =
      restaurant.online_capacity ||
      restaurant.max_capacity ||
      60;

    const { data: dailySettings } = await supabase
      .from("restaurant_daily_settings")
      .select("max_capacity_override")
      .eq("restaurant_id", restaurant.id)
      .eq("date", date)
      .maybeSingle();

    if (dailySettings?.max_capacity_override != null) {
      MAX_CAPACITY = dailySettings.max_capacity_override;
    }

    const SLOT_DURATION = restaurant.slot_duration_minutes || 90;
    const CAPACITY_MODE = restaurant.capacity_mode || "strict";

    // =========================
    // 3️⃣ Normalizar hora
    // =========================
    const formattedStart =
      time.includes(":") ? time : `${time}:00`;

    const startDateTime = new Date(`${date}T${formattedStart}:00`);
    const endDateTime = new Date(
      startDateTime.getTime() + SLOT_DURATION * 60000
    );

    const start_time = formattedStart;
    const end_time = endDateTime.toTimeString().slice(0, 5);

    // =========================
    // 4️⃣ Verificar reserva duplicada exacta
    // =========================
    const { data: existing } = await supabase
      .from("appointments")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("client_dni", dni)
      .eq("date", date)
      .eq("time", formattedStart)
      .eq("status", "confirmed")
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: "Ya tenés una reserva confirmada en ese horario.",
        existingReservation: existing,
      };
    }

    // =========================
    // 5️⃣ CONTROL POR TIPO DE MESA (FASE 2.1)
    // =========================
    const { data: tableInventory } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("capacity", { ascending: true });

    if (!tableInventory || tableInventory.length === 0) {
      return {
        success: false,
        message: "Inventario de mesas no configurado.",
      };
    }

    // Buscar mesa mínima que soporte la cantidad
    const suitableTable = tableInventory.find(
      (t) => t.capacity >= people
    );

    if (!suitableTable) {
      return {
        success: false,
        message:
          "No hay mesa disponible para esa cantidad de personas.",
      };
    }

    // Ver cuántas mesas de ese tipo ya están ocupadas
    const { data: overlappingTables } = await supabase
      .from("appointments")
      .select("assigned_table_capacity")
      .eq("restaurant_id", restaurant.id)
      .eq("date", date)
      .eq("status", "confirmed")
      .eq("assigned_table_capacity", suitableTable.capacity)
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    const usedTables = overlappingTables?.length || 0;

    if (usedTables >= suitableTable.quantity) {
      return {
        success: false,
        message:
          "No hay mesas disponibles para ese horario.",
      };
    }

    // =========================
    // 6️⃣ Control global por capacidad
    // =========================
    if (CAPACITY_MODE !== "disabled") {
      const { data: overlapping, error: overlapError } =
        await supabase
          .from("appointments")
          .select("people")
          .eq("restaurant_id", restaurant.id)
          .eq("date", date)
          .eq("status", "confirmed")
          .lt("start_time", end_time)
          .gt("end_time", start_time);

      if (overlapError) {
        console.error(
          "❌ Error verificando superposición:",
          overlapError
        );
        return {
          success: false,
          message: "Error verificando disponibilidad.",
        };
      }

      const currentPeople =
        overlapping?.reduce(
          (sum, r) => sum + (r.people || 0),
          0
        ) || 0;

      if (currentPeople + people > MAX_CAPACITY) {
        if (CAPACITY_MODE === "strict") {
          return {
            success: false,
            message:
              "No hay disponibilidad en ese horario.",
          };
        }

        if (CAPACITY_MODE === "warning") {
          console.warn(
            "⚠️ Capacidad excedida pero modo warning activo"
          );
        }
      }
    }

    // =========================
    // 7️⃣ Generar código
    // =========================
    const reservationCode = await generateReservationCode(
      restaurant.id,
      date
    );

    // =========================
    // 8️⃣ Insertar reserva
    // =========================
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        client_dni: dni,
        date,
        time: formattedStart,
        start_time,
        end_time,
        people,
        service: "reserva_mesa",
        status: "confirmed",
        reservation_code: reservationCode,
        restaurant_id: restaurant.id,
        assigned_table_capacity: suitableTable.capacity,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      reservation: data,
    };
  } catch (err) {
    console.error("❌ CREATE RESERVATION ERROR:", err);
    return {
      success: false,
      message: "Error interno al crear la reserva.",
    };
  }
}