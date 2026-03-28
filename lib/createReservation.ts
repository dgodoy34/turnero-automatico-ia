import { supabase } from "./supabaseClient";
import { generateReservationCode } from "./reservationCode";
import { checkLicense } from "./licenses/checkLicense";

type AvailabilityParams = {
  restaurant: any;
  date: string;
  time: string;
  people: number;
};

type BestSlotsParams = {
  restaurant: any;
  date: string;
  people: number;
  requestedTime: string;
};
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

async function simulateAvailability({
  restaurant,
  date,
  time,
  people,
}: AvailabilityParams) {
  const SLOT_DURATION = restaurant.slot_duration_minutes || 90;

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + SLOT_DURATION * 60000);

  const start_time = time;
  const end_time = end.toTimeString().slice(0, 5);

  const { data: tableInventory } = await supabase
    .from("restaurant_table_schedule")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("date", date);

  if (!tableInventory || tableInventory.length === 0) return false;

  const tables: number[] = [];

  tableInventory.forEach((t) => {
    for (let i = 0; i < t.quantity; i++) {
      tables.push(t.capacity);
    }
  });

  const { data: overlappingTables } = await supabase
    .from("appointments")
    .select("assigned_table_capacity")
    .eq("restaurant_id", restaurant.id)
    .eq("date", date)
    .eq("status", "confirmed")
    .lt("start_time", end_time)
    .gt("end_time", start_time);

  const used =
    overlappingTables?.map((r) => r.assigned_table_capacity) || [];

  const availableTables = [...tables];

  used.forEach((cap) => {
    const i = availableTables.indexOf(cap);
    if (i !== -1) availableTables.splice(i, 1);
  });

  availableTables.sort((a, b) => a - b);

  if (people <= 2) {
    return availableTables.some((t) => t >= 2);
  } else if (people <= 4) {
    return availableTables.some((t) => t >= 4);
  } else {
    return availableTables.some((t) => t >= 6);
  }
}

async function getBestAvailableSlots({
  restaurant,
  date,
  people,
  requestedTime,
}: BestSlotsParams) {
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .single();

  const open_time = settings?.open_time || "12:00";
  const close_time = settings?.close_time || "23:30";
  const interval = settings?.slot_interval || 30;

  const slots = generateTimeSlots(open_time, close_time, interval);

  const available: string[] = [];

  for (const slot of slots) {
    const ok = await simulateAvailability({
      restaurant,
      date,
      time: slot,
      people,
    });

    if (ok) available.push(slot);
  }

  // ordenar por cercanía
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  available.sort((a, b) => {
    return (
      Math.abs(toMin(a) - toMin(requestedTime)) -
      Math.abs(toMin(b) - toMin(requestedTime))
    );
  });

  return available.slice(0, 3);
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
// 5️⃣ MESAS DESDE SCHEDULE (ESTABLE)
// =========================

let tables: number[] = [];

// traer config del día
const { data: schedule } = await supabase
  .from("restaurant_table_schedule")
  .select("*")
  .eq("restaurant_id", restaurant.id)
  .eq("date", date);

// validar existencia
if (!schedule || schedule.length === 0) {
  return {
    success: false,
    message: "No hay mesas configuradas para ese día.",
  };
}

// filtrar turno correcto
const shift = schedule.filter((s) => {
  return start_time >= s.start_time && start_time < s.end_time;
});

// validar turno
if (!shift || shift.length === 0) {
  return {
    success: false,
    message: "El restaurante está cerrado en ese horario.",
  };
}

// expandir mesas
shift.forEach((t) => {
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

  const alternatives = await getBestAvailableSlots({
    restaurant,
    date,
    people,
    requestedTime: start_time,
  });

  if (alternatives.length > 0) {
    return {
      success: false,
      message:
        `No hay lugar a las ${start_time} 😕\n\n` +
        `Te puedo ofrecer:\n` +
        alternatives.map((t) => `👉 ${t}`).join("\n") +
        `\n\n¿Te sirve alguno?`,
    };
  }

  return {
    success: false,
    message: "No hay disponibilidad en ese horario.",
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