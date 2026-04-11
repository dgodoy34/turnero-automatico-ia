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
  business_id: string;
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
  business_id,
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
      .select("dni, phone, name")
      .eq("dni", dni)
      .maybeSingle();

    if (!client) {
      return {
        success: false,
        message: "El cliente no está registrado.",
      };
    }

    if (!client.phone) {
  return {
    success: false,
    message: "El cliente no tiene teléfono registrado.",
  };
}

    // =========================
    // 1️⃣ Obtener restaurante
    // =========================
   const { data: restaurant, error: restaurantError } = await supabase
  .from("restaurants")
  .select("*")
  .eq("id", business_id)
  .single();

const businessId = business_id;
    if (restaurantError || !restaurant) {
  return { success: false, message: "Restaurante no encontrado." };
}

// =========================
// 🔥 SETTINGS
// =========================
const { data: settings } = await supabase
  .from("settings")
  .select("*")
  .eq("business_id", businessId)
  .single();

const open_time = settings?.open_time || "12:00";
const close_time = settings?.close_time || "23:30";
const interval = settings?.slot_interval || 30;
const SLOT_DURATION = settings?.reservation_duration || 90;
const BUFFER = settings?.buffer_time || 0;

    // =========================
    // 🔐 Validar licencia
    // =========================
    const license = await checkLicense(businessId);

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
      .eq("business_id", businessId)
      .eq("date", date)
      .maybeSingle();

    if (dailySettings?.max_capacity_override != null) {
      MAX_CAPACITY = dailySettings.max_capacity_override;
    }
    const CAPACITY_MODE = restaurant.capacity_mode || "strict";



    
    // =========================
    // 3️⃣ Normalizar hora
    // =========================
    const formattedStart =
      time.includes(":") ? time : `${time}:00`;

    const startDateTime = new Date(`${date}T${formattedStart}:00`);
    const endDateTime = new Date(
  startDateTime.getTime() + (SLOT_DURATION + BUFFER) * 60000
);

    const start_time = formattedStart;
    const end_time = endDateTime.toTimeString().slice(0, 5);

    
// =========================
// 5️⃣ INVENTARIO REAL (FINAL)
// =========================

// 🔥 detectar turno
const shift = start_time <= "16:00" ? "Día" : "Noche";

// 🔥 traer inventario del día
let { data: tableInventory } = await supabase
  .from("restaurant_table_inventory")
  .select("*")
  .eq("business_id", businessId)
  .eq("date", date);

// 🔥 fallback a inventario base (sin fecha)
if (!tableInventory || tableInventory.length === 0) {
  console.log("⚠️ usando inventario DEFAULT");

  const { data: fallback } = await supabase
    .from("restaurant_table_inventory")
    .select("*")
    .eq("business_id", businessId)
    .is("date", null);

  tableInventory = fallback || [];
}

// 🔥 NORMALIZAR HORARIOS (CLAVE)
tableInventory = tableInventory.map(t => ({
  ...t,
  start_time: t.start_time?.slice(0,5),
  end_time: t.end_time?.slice(0,5),
}));

// 🔴 VALIDACIÓN FINAL
if (!tableInventory || tableInventory.length === 0) {
  return {
    success: false,
    message: "Inventario no configurado.",
  };
}

// 🔥 filtrar por turno (opcional pero recomendable)
if (shift === "Día") {
  tableInventory = tableInventory.filter(
    (t) => !t.start_time || t.start_time <= "16:00"
  );
}

if (shift === "Noche") {
  tableInventory = tableInventory.filter(
    (t) => !t.start_time || t.start_time > "16:00"
  );
}

// =========================
// 🔒 VALIDAR HORARIO MANUAL
// =========================

const validSlot = tableInventory.some((t) => {

  if (!t.start_time || !t.end_time) return true;

  // 👉 turno normal (ej: 12:00 - 16:00)
  if (t.start_time < t.end_time) {
    return start_time >= t.start_time && start_time < t.end_time;
  }

  // 🔥 turno nocturno (ej: 19:30 - 00:30)
  return (
    start_time >= t.start_time || start_time < t.end_time
  );
});

if (!validSlot) {

  const availableSlots = tableInventory
    .map(t => t.start_time?.slice(0,5))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  return {
    success: false,
    message:
      `Ese horario no está disponible 😕\n\n` +
      `📅 Para el ${date} podés reservar en:\n` +
      availableSlots.join(" - "),
  };
}



    // =========================
    // 4️⃣ Verificar duplicado
    // =========================
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("business_id", businessId)
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
      .eq("business_id", businessId)
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

// fallback
// 🔥 generar horarios dinámicos

const possibleTimes = generateTimeSlots(
  open_time,
  close_time,
  interval
);

// 🔥 calcular siguiente horario
let nextTime: string | null = null;

// 🔥 normalizar hora (clave)
// 🔥 generar múltiples opciones
const availableSlots = generateTimeSlots(
  open_time,
  close_time,
  interval
);

// 🔥 filtrar horarios futuros al solicitado
const alternatives = availableSlots
  .filter(t => t > start_time)
  .slice(0, 5); // máximo 5 opciones

return {
  success: false,
  message:
    alternatives.length > 0
      ? `No hay lugar a las ${start_time} 😕\n\n👉 Tengo disponible:\n${alternatives.join(" - ")}\n\n¿Te sirve alguno?`
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
        .eq("business_id", businessId)
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
      businessId,
      date
    );

    // =========================
    // 11️⃣ Insert
    // =========================
    const { data, error } = await supabase
      .from("appointments")
      .insert({
  client_dni: dni,
  phone: client.phone,
  name: client.name,
  date,
  time: formattedStart,
  start_time,
  end_time,
  people,
  service: "reserva_mesa",
  status: "confirmed",
  reservation_code: reservationCode,
  business_id: businessId,
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
