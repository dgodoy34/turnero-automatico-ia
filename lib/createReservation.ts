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
    // 1️⃣ Obtener restaurante
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
    // 2️⃣ Capacidad base
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
    // 4️⃣ Verificar duplicado
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
    // 5️⃣ INVENTARIO DE MESAS
    // =========================
    const { data: tableInventory } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("capacity", { ascending: false });

    if (!tableInventory || tableInventory.length === 0) {
      return {
        success: false,
        message: "Inventario de mesas no configurado.",
      };
    }

    // =========================
    // 6️⃣ Expandir mesas disponibles
    // =========================
    const tables: number[] = [];

    tableInventory.forEach((t) => {
      for (let i = 0; i < t.quantity; i++) {
        tables.push(t.capacity);
      }
    });

    // =========================
    // 7️⃣ Ver mesas ocupadas
    // =========================
    const { data: overlappingTables } = await supabase
      .from("appointments")
      .select("assigned_table_capacity")
      .eq("restaurant_id", restaurant.id)
      .eq("date", date)
      .eq("status", "confirmed")
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    const usedCapacities =
      overlappingTables?.map((r) => r.assigned_table_capacity) || [];

    // remover mesas ocupadas
    const availableTables = [...tables];

    usedCapacities.forEach((cap) => {
      const index = availableTables.indexOf(cap);
      if (index !== -1) availableTables.splice(index, 1);
    });

    // =========================
    // 8️⃣ Buscar combinación
    // =========================
    availableTables.sort((a, b) => b - a);

let assignedCapacity: number | null = null;

for (let i = 0; i < availableTables.length; i++) {

  let sum = availableTables[i];

  if (sum >= people) {
    assignedCapacity = sum;
    break;
  }

  for (let j = i + 1; j < availableTables.length; j++) {

    const combo = sum + availableTables[j];

    if (combo >= people) {
      assignedCapacity = combo;
      break;
    }

    for (let k = j + 1; k < availableTables.length; k++) {

      const combo3 = combo + availableTables[k];

      if (combo3 >= people) {
        assignedCapacity = combo3;
        break;
      }

    }

    if (assignedCapacity) break;
  }

  if (assignedCapacity) break;
}
    // =========================
    // 9️⃣ Control global capacidad
    // =========================
    if (CAPACITY_MODE !== "disabled") {
      const { data: overlapping } =
        await supabase
          .from("appointments")
          .select("people")
          .eq("restaurant_id", restaurant.id)
          .eq("date", date)
          .eq("status", "confirmed")
          .lt("start_time", end_time)
          .gt("end_time", start_time);

      const currentPeople =
        overlapping?.reduce(
          (sum, r) => sum + (r.people || 0),
          0
        ) || 0;

      if (currentPeople + people > MAX_CAPACITY) {
        return {
          success: false,
          message: "No hay disponibilidad en ese horario.",
        };
      }
    }

    // =========================
    // 🔟 Generar código
    // =========================
    const reservationCode = await generateReservationCode(
      restaurant.id,
      date
    );

    // =========================
    // 11️⃣ Insertar reserva
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
        assigned_table_capacity: assignedCapacity,
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