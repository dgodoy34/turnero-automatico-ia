import { supabase } from "./supabaseClient";
import { generateReservationCode } from "./reservationCode";
import { checkLicense } from "./licenses/checkLicense";

function generateTimeSlots(
  start = "12:00",
  end = "23:30",
  interval = 30
) {
  const slots: string[] = [];

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let current = new Date();
  current.setHours(startH, startM, 0);

  const endTime = new Date();
  endTime.setHours(endH, endM, 0);

  while (current <= endTime) {
    slots.push(current.toTimeString().slice(0, 5));
    current.setMinutes(current.getMinutes() + interval);
  }

  return slots;
}

type CreateReservationParams = {
  restaurant_id: string;
  dni: string;
  date: string;
  time: string;
  people: number;
};

// 🔥 TIPADO PRO (NUNCA undefined)
type CreateReservationResult =
  | { success: true; reservation: any }
  | { success: false; message: string };

export async function createReservation({
  restaurant_id,
  dni,
  date,
  time,
  people,
}: CreateReservationParams): Promise<CreateReservationResult> {

  try {

    // =========================
    // 🔒 VALIDAR CLIENTE (CLAVE)
    // =========================
    const { data: client } = await supabase
      .from("clients")
      .select("dni")
      .eq("dni", dni)
      .maybeSingle();

    if (!client) {
      return {
        success: false,
        message: "El cliente no está registrado.",
      };
    }

    // =========================
    // 1️⃣ Obtener restaurante
    // =========================
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return { success: false, message: "Restaurante no encontrado." };
    }

    // =========================
    // 🔐 Validar licencia
    // =========================
    const license = await checkLicense(restaurant.id);

    if (!license.valid) {
      return {
        success: false,
        message: "La licencia del restaurante no está activa.",
      };
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
      .select("id")
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
      };
    }

    // =========================
    // 5️⃣ INVENTARIO DE MESAS
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

    // =========================
    // 6️⃣ Expandir mesas
    // =========================
    const tables: number[] = [];

    tableInventory.forEach((t) => {
      for (let i = 0; i < t.quantity; i++) {
        tables.push(t.capacity);
      }
    });

    // =========================
    // 7️⃣ Ver ocupación
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

    const availableTables = [...tables];

    usedCapacities.forEach((cap) => {
      const index = availableTables.indexOf(cap);
      if (index !== -1) availableTables.splice(index, 1);
    });

    availableTables.sort((a, b) => a - b);

    let assignedCapacity: number | null = null;

    if (people <= 2) {
      assignedCapacity = availableTables.find((t) => t >= 2) || null;
    } else if (people <= 4) {
      assignedCapacity = availableTables.find((t) => t >= 4) || null;
    } else {
      assignedCapacity = availableTables.find((t) => t >= 6) || null;
    }

   if (!assignedCapacity) {

  // 🔥 generar horarios dinámicos (mediodía + noche)
  const possibleTimes = generateTimeSlots("12:00", "23:30", 30);

  let nextTime: string | null = null;

  const currentIndex = possibleTimes.indexOf(start_time);

  if (currentIndex !== -1) {
    for (let i = currentIndex + 1; i < possibleTimes.length; i++) {
      nextTime = possibleTimes[i];
      break; // primer siguiente horario
    }
  }

  return {
    success: false,
    message: nextTime
      ? `No hay lugar a las ${start_time} 😕\n\n👉 Tengo disponible ${nextTime}\n¿Te sirve?`
      : "No hay disponibilidad en ese horario.",
  };
}

    // =========================
    // 9️⃣ Control capacidad global
    // =========================
    if (CAPACITY_MODE !== "disabled") {
      const { data: overlapping } = await supabase
        .from("appointments")
        .select("people")
        .eq("restaurant_id", restaurant.id)
        .eq("date", date)
        .eq("status", "confirmed")
        .lt("start_time", end_time)
        .gt("end_time", start_time);

      const currentPeople =
        overlapping?.reduce((sum, r) => sum + (r.people || 0), 0) || 0;

      if (currentPeople + people > MAX_CAPACITY) {
        return {
          success: false,
          message: "No hay disponibilidad en ese horario.",
        };
      }
    }

    // =========================
    // 🔟 Código
    // =========================
    const reservationCode = await generateReservationCode(
      restaurant.id,
      date
    );

    // =========================
    // 11️⃣ Insert
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
        tables_used: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return {
        success: false,
        message: "Error al guardar la reserva.",
      };
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