import { supabase } from "./supabaseClient";
import { generateReservationCode } from "./reservationCode";
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

type CreateReservationParams = {
  business_id: string;
  dni: string;
  date: string;
  time: string;
  people: number;
  source?: string;
  client_name?: string;
  client_phone?: string;
};

type CreateReservationResult =
  | { success: true; reservation: any }
  | {
      success: false;
      message: string;
      type?: "NO_MORE_SLOTS" | "ALTERNATIVES";
      original_time?: string;
      alternatives?: string[];
    };

export async function createReservation({
  business_id,
  dni,
  date,
  time,
  people,
  source,
  client_name,
  client_phone,
}: CreateReservationParams): Promise<CreateReservationResult> {
  try {
    // 1. Validar Restaurante Activo
    const { data: restaurantActive } = await supabase
      .from("restaurants")
      .select("active")
      .eq("business_id", business_id)
      .single();

    if (!restaurantActive?.active) {
      return { success: false, message: "Servicio suspendido por falta de pago" };
    }

    // 2. Manejo de Cliente
    const WALKIN_DNI = "00000000";
    let client = null;

    if (source === "walkin") {
      let { data: existingClient } = await supabase
        .from("clients")
        .select("*")
        .eq("dni", WALKIN_DNI)
        .eq("business_id", business_id)
        .maybeSingle();

      if (!existingClient) {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({ dni: WALKIN_DNI, name: "Walk-in", phone: "0000000000", business_id })
          .select().single();
        client = newClient;
      } else {
        client = existingClient;
      }
    } else {
      let { data: existingClient } = await supabase
        .from("clients")
        .select("*")
        .eq("dni", dni)
        .eq("business_id", business_id)
        .maybeSingle();

      if (!existingClient) {
        const { data: newClient, error } = await supabase
          .from("clients")
          .insert({
            dni,
            name: client_name || "Cliente",
            phone: client_phone || "0000000000",
            business_id,
          })
          .select().single();
        if (error || !newClient) return { success: false, message: "Error creando cliente" };
        client = newClient;
      } else {
        client = existingClient;
      }
    }

    // 3. Configuración
    const { data: restaurant } = await supabase.from("restaurants").select("*").eq("business_id", business_id).single();
    const { data: settings } = await supabase.from("settings").select("*").eq("business_id", business_id).single();

    const open_time = settings?.open_time || "12:00";
    const close_time = settings?.close_time || "23:30";
    const interval = settings?.slot_interval || 30;
    
    // 🔥 DURACIÓN DINÁMICA: 90m para mesas chicas, 120m para mesas grandes
    const durationMinutes = people <= 4 ? 90 : 120;
    const BUFFER = settings?.buffer_time || 0;

    const license = await checkLicense(business_id);
    if (!license.valid) return { success: false, message: "Licencia no activa." };

    // 4. Tiempos
    const formattedStart = time.slice(0, 5);
    const startDateTime = new Date(`${date}T${formattedStart}:00-03:00`);
    const endDateTime = new Date(startDateTime.getTime() + (durationMinutes + BUFFER) * 60000);

    const start_time = formattedStart;
    let end_time = endDateTime.toTimeString().slice(0, 5);
    if (end_time < start_time && end_time !== "00:00") end_time = "23:59";

    // 5. Inventario
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

    // 6. Disponibilidad (Lógica de turnos e intervalos)
    const isNight = start_time > "16:00";
    const filteredInventory = tableInventory?.filter((item) => {
      if (!item.start_time) return true;
      const itemIsNight = item.start_time > "16:00";
      return isNight === itemIsNight;
    }) || [];

    const tables: number[] = [];
    filteredInventory.forEach((t) => {
      for (let i = 0; i < t.quantity; i++) tables.push(t.capacity);
    });

    // Consultar solapamientos reales
    const { data: overlappingTables } = await supabase
      .from("appointments")
      .select("assigned_table_capacity")
      .eq("business_id", business_id)
      .eq("date", date)
      .neq("status", "cancelled")
      .filter('start_time', 'lt', end_time)
      .filter('end_time', 'gt', start_time);

    const usedCapacities = overlappingTables?.map((r) => r.assigned_table_capacity) || [];
    const availableTables = [...tables];
    usedCapacities.forEach((cap) => {
      const index = availableTables.indexOf(cap);
      if (index !== -1) availableTables.splice(index, 1);
    });

    availableTables.sort((a, b) => a - b);
    let assignedCapacity = null;
    if (people <= 2) assignedCapacity = availableTables.find((t) => t >= 2) || null;
    else if (people <= 4) assignedCapacity = availableTables.find((t) => t >= 4) || null;
    else assignedCapacity = availableTables.find((t) => t >= 6) || null;

    // ❌ Respuesta de Sobreventa con Alternativas
    if (!assignedCapacity) {
      const allSlots = generateTimeSlots(open_time, close_time, interval);
      // Sugerimos horarios después de que se liberen las mesas actuales
      const alternatives = allSlots.filter((t) => t >= end_time).slice(0, 3);

      return {
        success: false,
        type: "ALTERNATIVES",
        original_time: start_time,
        message: alternatives.length > 0 
          ? `No hay lugar a las ${start_time} para ${people} personas. ¿Querés probar otro horario o cambiar de día?`
          : "No hay más disponibilidad en este turno.",
        alternatives
      };
    }

    // 7. Código de Reserva
    const year = new Date(date).getFullYear().toString().slice(2);
    const monthDay = date.slice(5, 7) + date.slice(8, 10);
    const { data: lastRes } = await supabase
      .from("appointments")
      .select("reservation_code")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let nextNum = 1;
    if (lastRes?.reservation_code) {
      const match = lastRes.reservation_code.match(/-(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const reservationCode = `RC-${restaurant?.branch_code || 'RES'}-${year}-${monthDay}-${nextNum.toString().padStart(4, "0")}`;

    // 8. Insert final
    const { data: finalRes, error: insertError } = await supabase
      .from("appointments")
      .insert({
        client_dni: source === "walkin" ? WALKIN_DNI : dni,
        phone: client_phone,
        name: client_name,
        date,
        time: formattedStart,
        start_time,
        end_time,
        people,
        service: "reserva_mesa",
        status: "confirmed",
        reservation_code: reservationCode,
        business_id,
        assigned_table_capacity: assignedCapacity,
        tables_used: 1,
        source: source || "manual",
      })
      .select().single();

    if (insertError) throw insertError;

    return { success: true, reservation: finalRes };

  } catch (error) {
    console.error("❌ Error:", error);
    return { success: false, message: "Error al procesar la reserva." };
  }
}