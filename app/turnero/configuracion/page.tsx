"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// 1. Tipos de datos (Fuera del componente está bien)
type TableConfig = {
  capacity: number;
  quantity: number;
};

type Shift = {
  name: string;
  start_time: string;
  end_time: string;
  tables: TableConfig[];
};

export default function Configuracion() {
  // 2. Todos los ESTADOS (Dentro del componente)
  const [isMounted, setIsMounted] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedShiftIndex, setSelectedShiftIndex] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [generalSettings, setGeneralSettings] = useState({
    duration_small: 90,
    duration_medium: 120,
    duration_large: 150,
    slot_interval: 30
  });

  const currentShift = shifts[selectedShiftIndex];

  // 3. EFECTO: Obtener el ID del restaurante al cargar
  useEffect(() => {
    setIsMounted(true);
    const fetchBusinessData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.business_id) {
        setBusinessId(user.user_metadata.business_id);
      }
    };
    fetchBusinessData();
  }, []);

  // 4. EFECTO: Cargar datos cuando cambie la fecha o el businessId
  useEffect(() => {
    if (businessId) {
      loadShifts();
      loadGeneralSettings();
    }
  }, [date, businessId]);

  // 5. FUNCIONES DE CARGA (load)
  async function loadShifts() {
    if (!businessId) return;
    try {
      let { data } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("business_id", businessId)
        .eq("date", date);

      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from("restaurant_table_inventory")
          .select("*")
          .eq("business_id", businessId)
          .is("date", null);
        data = fallback || [];
      }

      const grouped: any = {};
      data.forEach((row: any) => {
        const key = `${row.start_time}-${row.end_time}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: `${row.start_time.slice(0,5)} - ${row.end_time.slice(0,5)}`,
            start_time: row.start_time.slice(0,5),
            end_time: row.end_time.slice(0,5),
            tables: []
          };
        }
        grouped[key].tables.push({ capacity: row.capacity, quantity: row.quantity });
      });

      const result = Object.values(grouped) as Shift[];
      setShifts(result.length > 0 ? result : [{
        name: "12:00 - 16:00",
        start_time: "12:00",
        end_time: "16:00",
        tables: [{ capacity: 2, quantity: 0 }, { capacity: 4, quantity: 0 }, { capacity: 6, quantity: 0 }]
      }]);
    } catch (e) { console.error(e); }
  }

  async function loadGeneralSettings() {
    if (!businessId) return;
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();
    
    if (data) {
      setGeneralSettings({
        duration_small: data.duration_small || 90,
        duration_medium: data.duration_medium || 120,
        duration_large: data.duration_large || 150,
        slot_interval: data.slot_interval || 30
      });
    }
  }

  // 6. FUNCIONES DE GUARDADO (save)
  async function saveGeneralSettings() {
    if (!businessId) return;
    const { error } = await supabase
      .from("settings")
      .upsert({
        business_id: businessId,
        ...generalSettings
      }, { onConflict: 'business_id' });

    if (error) alert("Error: " + error.message);
    else alert("Configuración actualizada ✅");
  }

  async function saveShifts() {
    if (!businessId) return;
    try {
      await supabase.from("restaurant_table_inventory").delete().eq("business_id", businessId).eq("date", date);
      await supabase.from("restaurant_table_schedule").delete().eq("business_id", businessId).eq("date", date);

      const inventoryRows = shifts.flatMap((shift) =>
        shift.tables.map((t) => ({
          business_id: businessId,
          date: date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          capacity: t.capacity,
          quantity: t.quantity,
        }))
      );
      await supabase.from("restaurant_table_inventory").insert(inventoryRows);

      const scheduleRows = shifts.map((shift) => ({
        business_id: businessId,
        date: date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        capacity: shift.tables.reduce((acc, t) => acc + t.capacity * t.quantity, 0),
        quantity: 1,
      }));
      await supabase.from("restaurant_table_schedule").insert(scheduleRows);

      alert("✅ Guardado correctamente");
      loadShifts();
    } catch (err) { alert("Error inesperado"); }
  }

  async function copyToWeek() {
    if (!businessId) return;
    try {
      const baseDate = new Date(date);
      const days = [0,1,2,3,4,5,6].map((d) => {
        const newDate = new Date(baseDate);
        newDate.setDate(baseDate.getDate() + d);
        return newDate.toISOString().split("T")[0];
      });

      for (const d of days) {
        await supabase.from("restaurant_table_inventory").delete().eq("business_id", businessId).eq("date", d);
        await supabase.from("restaurant_table_schedule").delete().eq("business_id", businessId).eq("date", d);

        const inventoryRows = shifts.flatMap((shift) =>
          shift.tables.map((t) => ({
            business_id: businessId, date: d,
            start_time: shift.start_time, end_time: shift.end_time,
            capacity: t.capacity, quantity: t.quantity,
          }))
        );
        await supabase.from("restaurant_table_inventory").insert(inventoryRows);

        const scheduleRows = shifts.map((shift) => ({
          business_id: businessId, date: d,
          start_time: shift.start_time, end_time: shift.end_time,
          capacity: shift.tables.reduce((acc, t) => acc + t.capacity * t.quantity, 0),
          quantity: 1,
        }));
        await supabase.from("restaurant_table_schedule").insert(scheduleRows);
      }
      alert("✅ Copiado a toda la semana");
    } catch (e) { alert("Error al copiar"); }
  }

  // 7. RENDERIZADO
  if (!isMounted) return null;

  const sortedShifts = [...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold">Configuración del restaurante</h1>

      {/* --- BLOQUE 1: DURACIONES --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 text-indigo-700">🕒 Duración de Reservas por Tamaño de Mesa</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Mesa para 2 (min)</label>
            <input type="number" value={generalSettings.duration_small} 
              onChange={(e) => setGeneralSettings({...generalSettings, duration_small: Number(e.target.value)})}
              className="w-full border border-gray-300 p-2.5 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Mesa para 4 (min)</label>
            <input type="number" value={generalSettings.duration_medium}
              onChange={(e) => setGeneralSettings({...generalSettings, duration_medium: Number(e.target.value)})}
              className="w-full border border-gray-300 p-2.5 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Mesa para 6+ (min)</label>
            <input type="number" value={generalSettings.duration_large}
              onChange={(e) => setGeneralSettings({...generalSettings, duration_large: Number(e.target.value)})}
              className="w-full border border-gray-300 p-2.5 rounded-lg" />
          </div>
          <button onClick={saveGeneralSettings} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold">Guardar Tiempos</button>
        </div>
      </div>

      {/* --- BLOQUE 2: TURNOS Y MESAS --- */}
      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2 rounded" />
        
        <div className="flex gap-2 flex-wrap">
          {sortedShifts.map((shift, index) => (
            <button key={index} onClick={() => setSelectedShiftIndex(index)}
              className={`px-4 py-2 rounded ${selectedShiftIndex === index ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
              {shift.name}
            </button>
          ))}
          <button onClick={() => {
            const newShift = { name: "12:00 - 14:00", start_time: "12:00", end_time: "14:00", 
              tables: [{ capacity: 2, quantity: 0 }, { capacity: 4, quantity: 0 }, { capacity: 6, quantity: 0 }] };
            setShifts([...shifts, newShift]);
            setSelectedShiftIndex(shifts.length);
          }} className="px-4 py-2 rounded bg-green-600 text-white">➕ Agregar turno</button>
        </div>

        {currentShift && (
          <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
            <div className="flex gap-2">
              <input type="time" value={currentShift.start_time} onChange={(e) => {
                const up = [...shifts]; up[selectedShiftIndex].start_time = e.target.value; setShifts(up);
              }} className="border p-2 rounded-lg" />
              <input type="time" value={currentShift.end_time} onChange={(e) => {
                const up = [...shifts]; up[selectedShiftIndex].end_time = e.target.value; setShifts(up);
              }} className="border p-2 rounded-lg" />
            </div>
            {currentShift.tables.map((table, i) => (
              <div key={i} className="flex justify-between items-center border p-4 rounded-xl bg-white shadow-sm">
                <span>Mesas para {table.capacity} personas</span>
                <input type="number" value={table.quantity} onChange={(e) => {
                  const up = [...shifts]; up[selectedShiftIndex].tables[i].quantity = Number(e.target.value); setShifts(up);
                }} className="border p-2 w-24 rounded text-center" />
              </div>
            ))}
            <button onClick={() => {
                const up = shifts.filter((_, i) => i !== selectedShiftIndex);
                setShifts(up); setSelectedShiftIndex(0);
              }} className="bg-red-500 text-white px-3 py-1 rounded text-xs">Eliminar este turno</button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={saveShifts} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold">💾 Guardar Cambios del Día</button>
          <button onClick={copyToWeek} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Copiar a toda la semana</button>
        </div>
      </div>
    </div>
  );
}