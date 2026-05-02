import { supabase } from "./supabaseClient";
import { checkLicense } from "./licenses/checkLicense";

function generateTimeSlots(start = "12:00", end = "23:30", interval = 30) {
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

export async function createReservation({
  business_id,
  dni,
  date,
  time,
  people,
  source,
  client_name,
  client_phone,
}: any) {
  try {
    // ======================================
    // 1. VALIDAR RESTAURANTE
    // ======================================
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("business_id", business_id)
      .single();

    if (!restaurant?.active) {
      return { success: false, message: "Restaurante inactivo" };
    }

    const license = await checkLicense(business_id);
    if (!license.valid) {
      return { success: false, message: "Licencia inactiva" };
    }

    // ======================================
    // 2. CLIENTE
    // ======================================
    let { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("dni", dni)
      .eq("business_id", business_id)
      .maybeSingle();

    if (!client) {
      const { data: newClient } = await supabase
        .from("clients")
        .insert({
          dni,
          name: client_name || "Cliente",
          phone: client_phone || "0000000000",
          business_id,
        })
        .select()
        .single();

      client = newClient;
    }

    // ======================================
    // 3. SETTINGS
    // ======================================
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .eq("business_id", business_id)
      .single();

    const open_time = settings?.open_time || "12:00";
    const close_time = settings?.close_time || "23:30";
    const interval = settings?.slot_interval || 30;
    const BUFFER = settings?.buffer_time || 0;

    let SLOT_DURATION = 90;

    if (people <= 2) SLOT_DURATION = settings?.duration_small || 90;
    else if (people <= 4) SLOT_DURATION = settings?.duration_medium || 120;
    else SLOT_DURATION = settings?.duration_large || 150;

    // ======================================
    // 4. HORARIOS
    // ======================================
    const start_time = time.slice(0, 5);

    const startDate = new Date(`${date}T${start_time}:00`);
    const endDate = new Date(startDate.getTime() + (SLOT_DURATION + BUFFER) * 60000);

    const end_time = endDate.toTimeString().slice(0, 5);

    // ======================================
    // 5. INVENTARIO
    // ======================================
    let { data: tableInventory } = await supabase
      .from("restaurant_table_inventory")
      .select("*")
      .eq("business_id", business_id)
      .eq("date", date);

    if (!tableInventory || tableInventory.length === 0) {
      const { data: fallback } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("business_id", business_id)
        .is("date", null);

      tableInventory = fallback || [];
    }

    if (!tableInventory || tableInventory.length === 0) {
      return { success: false, message: "Inventario no configurado" };
    }

    // ======================================
    // 6. DISPONIBILIDAD
    // ======================================
    const isNight = start_time > "16:00";

const filteredInventory = tableInventory.filter((item: any) => {
  if (!item.start_time) return true;
  return (item.start_time > "16:00") === isNight;
});

// 🔥 expandir mesas
const tables: number[] = [];

filteredInventory.forEach((t: any) => {
  for (let i = 0; i < t.quantity; i++) {
    tables.push(t.capacity);
  }
});

// 🔥 reservas que se solapan
const { data: overlapping } = await supabase
  .from("appointments")
  .select("assigned_table_capacity")
  .eq("business_id", business_id)
  .eq("date", date)
  .eq("status", "confirmed")
  .filter("start_time", "lt", end_time)
  .filter("end_time", "gt", start_time);

// ======================================
// 🔥 FIX REAL (conteo correcto)
// ======================================

// total por capacidad
const totalByCapacity: Record<number, number> = {};
tables.forEach((t) => {
  totalByCapacity[t] = (totalByCapacity[t] || 0) + 1;
});

// usadas por capacidad
const usedByCapacity: Record<number, number> = {};
(overlapping || []).forEach((r: any) => {
  const cap = r.assigned_table_capacity;
  usedByCapacity[cap] = (usedByCapacity[cap] || 0) + 1;
});

// disponibles reales
const available: number[] = [];

Object.keys(totalByCapacity).forEach((capStr) => {
  const cap = Number(capStr);
  const total = totalByCapacity[cap] || 0;
  const used = usedByCapacity[cap] || 0;

  const free = Math.max(0, total - used);

  for (let i = 0; i < free; i++) {
    available.push(cap);
  }
});

// ordenar
available.sort((a, b) => a - b);

    // ======================================
    // 7. ASIGNACIÓN SIN COMBINAR
    // ======================================
    let assignedCapacity: number | null = null;

    if (people <= 2) assignedCapacity = available.find((t) => t === 2) || null;
    else if (people <= 4) assignedCapacity = available.find((t) => t === 4) || null;
    else assignedCapacity = available.find((t) => t === 6) || null;

    if (!assignedCapacity) {
      const alternatives = generateTimeSlots(open_time, close_time, interval)
        .filter((t) => t > start_time)
        .slice(0, 3);

      return {
        success: false,
        message: "No hay disponibilidad",
        type: "ALTERNATIVES",
        alternatives,
      };
    }

    // ======================================
    // 8. CÓDIGO RESERVA
    // ======================================
    const { data: last } = await supabase
      .from("appointments")
      .select("reservation_code")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let next = 1;
    if (last?.reservation_code) {
      const m = last.reservation_code.match(/-(\d+)$/);
      if (m) next = parseInt(m[1]) + 1;
    }

    const code = `RC-${restaurant.branch_code}-${date.replace(/-/g, "")}-${next
      .toString()
      .padStart(4, "0")}`;

// ======================================
// 🔒 8.5 PROTECCIÓN CONTRA DUPLICADOS (WEBHOOK)
// ======================================
const { count } = await supabase
  .from("appointments")
  .select("id", { count: "exact", head: true })
  .eq("business_id", business_id)
  .eq("date", date)
  .eq("start_time", start_time)
  .eq("assigned_table_capacity", assignedCapacity)
  .eq("status", "confirmed");

const totalForCapacity = tables.filter(t => t === assignedCapacity).length;

if ((count ?? 0) >= totalForCapacity) {
  return {
    success: false,
    message: "Lo siento, esa mesa ya fue tomada recién. Probá otro horario.",
  };
}
// ======================================
// 9. INSERT + PROTECCIÓN REAL
// ======================================
const { data: inserted, error: insertError } = await supabase
  .from("appointments")
  .insert({
    business_id,
    date,

    // 🔥 columnas obligatorias
    time: start_time,
    service: "Reserva",

    // horarios
    start_time,
    end_time,

    // mesa
    assigned_table_capacity: assignedCapacity,

    // cliente
    client_dni: dni,
    name: client_name || "Cliente",
    phone: client_phone || "",

    // reserva
    people,
    status: "confirmed",
    reservation_code: code,
    source: source || "web",

    notes: null,
  })
  .select()
  .single();

// ======================================
// 🔥 ERROR HANDLER REAL
// ======================================
if (insertError) {
  console.log("❌ INSERT ERROR:", insertError);

  // 🔥 ESTE ES EL FIX REAL
  if (insertError.code === "23505") {
    return {
      success: false,
      message: "Lo siento, esa mesa se acaba de reservar recién. Probá otro horario.",
    };
  }

  return {
    success: false,
    message: insertError.message || "Error al crear la reserva",
  };
}
// ======================================
// 10. OK
// ======================================
return {
  success: true,
  reservation: inserted,
};
  } catch (error) {
    console.error("❌ CATCH ERROR:", error);
    return {
      success: false,
      message: "Error al crear la reserva",
    };
  }
}