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
      alternatives?: string[]; // 👈 Agregá esta línea
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

    // 2. Manejo de Cliente (Walk-in o Regular)
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
          .insert({
            dni: WALKIN_DNI,
            name: "Walk-in",
            phone: "0000000000",
            business_id: business_id,
          })
          .select()
          .single();
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
            dni: dni,
            name: client_name || "Cliente",
            phone: client_phone || "0000000000",
            business_id: business_id,
          })
          .select()
          .single();

        if (error || !newClient) return { success: false, message: "Error creando cliente" };
        client = newClient;
      } else {
        client = existingClient;
      }
    }

    // 3. Obtener Datos del Restaurante y Configuración
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("business_id", business_id)
      .single();

    if (restaurantError || !restaurant) {
      return { success: false, message: "Restaurante no encontrado." };
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .eq("business_id", business_id)
      .single();

    const open_time = settings?.open_time || "12:00";
    const close_time = settings?.close_time || "23:30";
    const interval = settings?.slot_interval || 30;
    const BUFFER = settings?.buffer_time || 0;

    // 🔥 CORRECCIÓN HÍBRIDA: 
    // Si settings.reservation_duration tiene un valor (ej: 100), usamos ese.
    // Si está vacío o es 0, aplica la inteligencia (<=4 personas 90min, sino 120min).
   // 🔥 DURACIÓN DINÁMICA SEGÚN CONFIGURACIÓN
let SLOT_DURATION = 90; // Default de seguridad

if (people <= 2) {
  SLOT_DURATION = settings?.duration_small || 90;
} else if (people <= 4) {
  SLOT_DURATION = settings?.duration_medium || 120;
} else {
  SLOT_DURATION = settings?.duration_large || 150;
}

    const license = await checkLicense(business_id);
    if (!license.valid) {
      return { success: false, message: "La licencia del restaurante no está activa." };
    }

    // 4. Normalizar Horarios
    const formattedStart = time.slice(0, 5);
    const startDateTime = new Date(`${date}T${formattedStart}:00-03:00`);
    
    // Calcula el fin basado en la duración dinámica + el buffer
    const endDateTime = new Date(startDateTime.getTime() + (SLOT_DURATION + BUFFER) * 60000);

    const start_time = formattedStart;
    let end_time = endDateTime.toTimeString().slice(0, 5);

    // 5. Inventario de Mesas
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
      return { success: false, message: "Inventario no configurado." };
    }

   // ======================================
    // 6. Calcular Disponibilidad de Mesas (Sincronizado con Inventario)
    // ======================================
    
    // Determinamos el turno basado en la hora de la reserva (siguiendo tu lógica de route.ts)
    // Si la reserva es <= 16:00 es Día, sino Noche.
    const isNight = start_time > "16:00";

    // 6a. Filtrar inventario por turno
    const filteredInventory = tableInventory.filter((item) => {
      if (!item.start_time) return true; // Si no tiene hora, es válida siempre
      const itemIsNight = item.start_time > "16:00";
      return isNight === itemIsNight;
    });

    const tables: number[] = [];
    filteredInventory.forEach((t) => {
      for (let i = 0; i < t.quantity; i++) {
        tables.push(t.capacity);
      }
    });

    // 6b. Consultar solapamientos reales (Lógica de intersección de intervalos)
    const { data: overlappingTables } = await supabase
      .from("appointments")
      .select("assigned_table_capacity")
      .eq("business_id", business_id)
      .eq("date", date)
      .neq("status", "cancelled")
      .filter('start_time', 'lt', end_time)  // Empieza antes de que yo termine
      .filter('end_time', 'gt', start_time); // Termina después de que yo empiece

    const usedCapacities = overlappingTables?.map((r) => r.assigned_table_capacity) || [];
    const availableTables = [...tables];

    // Restamos las mesas que están siendo ocupadas EN ESE MOMENTO
    usedCapacities.forEach((cap) => {
      const index = availableTables.indexOf(cap);
      if (index !== -1) availableTables.splice(index, 1);
    });

    availableTables.sort((a, b) => a - b);
    
    let assignedCapacity = null;
    if (people <= 2) assignedCapacity = availableTables.find((t) => t >= 2) || null;
    else if (people <= 4) assignedCapacity = availableTables.find((t) => t >= 4) || null;
    else assignedCapacity = availableTables.find((t) => t >= 6) || null;

    if (!assignedCapacity) {
      const availableSlots = generateTimeSlots(open_time, close_time, interval);
      // Buscamos 3 horarios después de la hora que pidió
      const alternatives = availableSlots.filter((t) => t > start_time).slice(0, 3);

      return {
        success: false,
        type: "ALTERNATIVES", // 👈 CLAVE: Esto le avisa al Webhook que use el menú de @img2
        message: alternatives.length > 0 
          ? `No hay mesas disponibles a las ${start_time}.`
          : "Lo sentimos, no hay disponibilidad para esa cantidad de personas.",
        // @ts-ignore
        alternatives: alternatives 
      };
    }
    // 7. Generar Código de Reserva
    const year = new Date(date).getFullYear().toString().slice(2);
    const monthDay = date.slice(5, 7) + date.slice(8, 10);
    const { data: lastRes } = await supabase
      .from("appointments")
      .select("reservation_code")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (lastRes?.reservation_code) {
      const match = lastRes.reservation_code.match(/-(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const reservationCode = `RC-${restaurant.branch_code}-${year}-${monthDay}-${nextNum.toString().padStart(4, "0")}`;

    // 8. LLAMADA A LA FUNCIÓN RPC (Seguridad contra sobreventa)
    // En lugar de un insert directo, ejecutamos el "guardia" de la DB
    // En tu createReservation.ts, el paso 8 debe ser así:
// BUSCÁ ESTA PARTE EN TU createReservation.ts Y MODIFICÁ ESTAS LÍNEAS:
// Función auxiliar para normalizar la hora (ponerla al final de tu archivo o afuera de createReservation)
const normalize = (t: string) => t.split(':').length === 2 ? `${t}:00` : t;

const { data: rpcData, error: rpcError } = await supabase.rpc('crear_reserva_segura', {
  p_business_id: business_id,
  p_dni: dni,
  p_name: client_name || 'Cliente',
  p_phone: client_phone || '000000',
  p_date: date,
  p_time: time.slice(0, 5),
  p_start_time: normalize(start_time), // Asegura HH:MM:SS
  p_end_time: normalize(end_time),     // Asegura HH:MM:SS
  p_people: people,
  p_assigned_capacity: assignedCapacity,
  p_reservation_code: reservationCode,
  p_source: source || 'whatsapp'
});
    // 9. MANEJO DE ERRORES DE LA RPC
    if (rpcError) {
      console.error("❌ Error técnico en RPC:", rpcError);
      return { success: false, message: "Error técnico en el servidor de reservas." };
    }

    // La RPC devuelve un JSON { success: boolean, message: string }
    if (!rpcData.success) {
      if (rpcData.message === 'NO_AVAILABILITY') {
        return {
          success: false,
          message: "¡Lo sentimos! Ya no quedan mesas disponibles para este horario. Por favor, selecciona otro.",
        };
      }
      return { success: false, message: "Error: " + rpcData.message };
    }

    // 10. TODO OK - Obtener la reserva recién creada para devolverla al front
    // Como la RPC ya insertó, podemos buscarla por el código único
    const { data: finalRes } = await supabase
      .from("appointments")
      .select("*")
      .eq("reservation_code", reservationCode)
      .single();

    return {
      success: true,
      reservation: finalRes,
    };

  } catch (error) {
    console.error("❌ Error inesperado:", error);
    return {
      success: false,
      message: "Error inesperado al procesar la reserva.",
    };
  }
}