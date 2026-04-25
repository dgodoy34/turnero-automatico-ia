"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  // 1. OBTENER BUSINESS ID (solo al montar)
  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await fetch(`/api/settings`);

        if (!res.ok) {
          console.error("Error settings:", await res.text());
          return;
        }

        const data = await res.json();

        if (data?.businessId) {
  setBusinessId(data.businessId);
} else {
          console.error("No llego business_id desde la API");
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }

    loadBusiness();
    setIsMounted(true);
  }, []);

  // 2. CARGAR DATOS cuando businessId este listo o cambie la fecha
  useEffect(() => {
    if (!businessId) return; // Esperar a tener businessId
    
    loadShifts();
    loadGeneralSettings();
  }, [businessId, date]);

  const currentShift = shifts[selectedShiftIndex];

  // Cargar shifts desde DB
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

      const grouped: Record<string, Shift> = {};

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

        grouped[key].tables.push({
          capacity: row.capacity,
          quantity: row.quantity
        });
      });

      const result = Object.values(grouped) as Shift[];

      const finalShifts: Shift[] =
        result.length > 0
          ? result
          : [
              {
                name: "12:00 - 16:00",
                start_time: "12:00",
                end_time: "16:00",
                tables: [
                  { capacity: 2, quantity: 0 },
                  { capacity: 4, quantity: 0 },
                  { capacity: 6, quantity: 0 }
                ]
              }
            ];

      setShifts(finalShifts);
      setSelectedShiftIndex(0);

    } catch (e) {
      console.error(e);
    }
  }

  // Cargar settings generales
  async function loadGeneralSettings() {
    if (!businessId) return;
    
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();
    
    if (data) {
      setGeneralSettings({
        duration_small: data.duration_small || 0,
        duration_medium: data.duration_medium || 0,
        duration_large: data.duration_large || 0,
        slot_interval: data.slot_interval || 30
      });
    }
  }

  // Guardar shifts
  async function saveShifts() {
    try {
      if (!businessId) {
        alert("No hay business_id");
        return;
      }

      await supabase
        .from("restaurant_table_inventory")
        .delete()
        .eq("business_id", businessId)
        .eq("date", date);

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

      const { error } = await supabase
        .from("restaurant_table_inventory")
        .insert(inventoryRows);

      if (error) {
        alert("Error al guardar: " + error.message);
        return;
      }

      // Sincronizar schedule
      await supabase
        .from("restaurant_table_schedule")
        .delete()
        .eq("business_id", businessId)  
        .eq("date", date);

      const scheduleRows = shifts.map((shift) => {
        const totalCapacity = shift.tables.reduce(
          (acc, t) => acc + t.capacity * t.quantity,
          0
        );

        return {
          business_id: businessId,
          date: date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          capacity: totalCapacity,
          quantity: 1,
        };
      });

      await supabase
        .from("restaurant_table_schedule")
        .insert(scheduleRows);

      alert("Configuracion guardada correctamente");
      await loadShifts();

    } catch (err) {
      console.error(err);
      alert("Error inesperado");
    }
  }

  // Guardar configuracion general
  async function saveGeneralSettings() {
    if (!businessId) return;
    
    const { error } = await supabase
      .from("settings")
      .upsert({
        business_id: businessId,
        duration_small: generalSettings.duration_small,
        duration_medium: generalSettings.duration_medium,
        duration_large: generalSettings.duration_large,
        slot_interval: generalSettings.slot_interval
      }, { 
        onConflict: 'business_id'
      });

    if (error) {
      console.error("Error completo:", error);
      alert("Error: " + error.message);
    } else {
      alert("Configuracion actualizada");
    }
  }

  // Copiar a la semana
  async function copyToWeek() {
    try {
      if (!businessId) {
        alert("No hay business_id");
        return;
      }

      const baseDate = new Date(date);

      const days = [0,1,2,3,4,5,6].map((d) => {
        const newDate = new Date(baseDate);
        newDate.setDate(baseDate.getDate() + d);
        return newDate.toISOString().split("T")[0];
      });

      for (const d of days) {
        await supabase
          .from("restaurant_table_inventory")
          .delete()
          .eq("business_id", businessId)
          .eq("date", d);

        await supabase
          .from("restaurant_table_schedule")
          .delete()
          .eq("business_id", businessId)
          .eq("date", d);

        const inventoryRows = shifts.flatMap((shift) =>
          shift.tables.map((t) => ({
            business_id: businessId,
            date: d,
            start_time: shift.start_time,
            end_time: shift.end_time,
            capacity: t.capacity,
            quantity: t.quantity,
          }))
        );

        const { error: invError } = await supabase
          .from("restaurant_table_inventory")
          .insert(inventoryRows);

        if (invError) {
          console.error(invError);
          alert("Error guardando inventario");
          return;
        }

        const scheduleRows = shifts.map((shift) => {
          const totalCapacity = shift.tables.reduce(
            (acc, t) => acc + t.capacity * t.quantity,
            0
          );

          return {
            business_id: businessId,
            date: d,
            start_time: shift.start_time,
            end_time: shift.end_time,
            capacity: totalCapacity,
            quantity: 1,
          };
        });

        const { error: schError } = await supabase
          .from("restaurant_table_schedule")
          .insert(scheduleRows);

        if (schError) {
          console.error(schError);
          alert("Error guardando schedule");
          return;
        }
      }

      alert("Copiado a toda la semana");

    } catch (e) {
      console.error(e);
      alert("Error al copiar");
    }
  }

  if (!isMounted) return null;

  const sortedShifts = [...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuracion del restaurante</h1>

      {/* Configuracion de duracion por capacidad */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-indigo-700 flex items-center gap-2">
          Duracion de Reservas por Tamano de Mesa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Mesa para 2 (min)</label>
            <input
              type="number"
              value={generalSettings.duration_small || 90}
              onChange={(e) => setGeneralSettings({...generalSettings, duration_small: Number(e.target.value)})}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Mesa para 4 (min)</label>
            <input
              type="number"
              value={generalSettings.duration_medium || 120}
              onChange={(e) => setGeneralSettings({...generalSettings, duration_medium: Number(e.target.value)})}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Mesa para 6+ (min)</label>
            <input
              type="number"
              value={generalSettings.duration_large || 150}
              onChange={(e) => setGeneralSettings({...generalSettings, duration_large: Number(e.target.value)})}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={saveGeneralSettings}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition font-semibold text-sm"
          >
            Guardar Tiempos
          </button>
        </div>
      </div>

      {/* Configuracion de turnos */}
      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />

        <div className="flex gap-2 flex-wrap">
          {sortedShifts.map((shift, index) => (
            <button
              key={index}
              onClick={() => setSelectedShiftIndex(index)}
              className={`px-4 py-2 rounded ${
                selectedShiftIndex === index
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {shift.name}
            </button>
          ))}

          <button
            onClick={() => {
              const newShift = {
                name: "12:00 - 14:00",
                start_time: "12:00",
                end_time: "14:00",
                tables: [
                  { capacity: 2, quantity: 0 },
                  { capacity: 4, quantity: 0 },
                  { capacity: 6, quantity: 0 }
                ]
              };

              setShifts([...shifts, newShift]);
              setSelectedShiftIndex(shifts.length);
            }}
            className="px-4 py-2 rounded bg-green-600 text-white"
          >
            + Agregar turno
          </button>
        </div>

        {currentShift && (
          <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-lg">
              Turno {currentShift.name}
            </h3>

            <div className="flex gap-2">
              <input
                type="time"
                step="60"
                value={currentShift.start_time?.slice(0,5)}
                onChange={(e) => {
                  const updated = [...shifts];
                  updated[selectedShiftIndex].start_time = e.target.value;
                  updated[selectedShiftIndex].name =
                    `${e.target.value} - ${updated[selectedShiftIndex].end_time}`;
                  setShifts(updated);
                }}
                className="border p-2 rounded-lg"
              />

              <input
                type="time"
                step="60"
                value={currentShift.end_time?.slice(0,5)}
                onChange={(e) => {
                  const updated = [...shifts];
                  updated[selectedShiftIndex].end_time = e.target.value;
                  updated[selectedShiftIndex].name =
                    `${updated[selectedShiftIndex].start_time} - ${e.target.value}`;
                  setShifts(updated);
                }}
                className="border p-2 rounded-lg"
              />
            </div>

            <button
              onClick={() => {
                const updated = shifts.filter((_, i) => i !== selectedShiftIndex);
                setShifts(updated);
                setSelectedShiftIndex(
                  updated.length === 0 ? 0 : Math.max(0, selectedShiftIndex - 1)
                );
              }}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Eliminar turno
            </button>

            {currentShift.tables.map((table, i) => (
              <div
                key={i}
                className="flex justify-between items-center border p-4 rounded-xl bg-white shadow-sm"
              >
                <span>Mesas para {table.capacity} personas</span>

                <input
                  type="number"
                  value={table.quantity}
                  onChange={(e) => {
                    const updated = [...shifts];
                    updated[selectedShiftIndex].tables[i].quantity = Number(e.target.value);
                    setShifts(updated);
                  }}
                  className="border p-2 w-24 rounded text-center"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={saveShifts}
            className="bg-indigo-600 text-white px-6 py-2 rounded"
          >
            Guardar cambios
          </button>

          <button
            onClick={copyToWeek}
            className="bg-green-600 text-white px-6 py-2 rounded"
          >
            Copiar a toda la semana
          </button>
        </div>
      </div>

      {/* Vista actual */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4">
          Configuracion del {date}
        </h2>

        {shifts.map((shift, i) => (
          <div key={i} className="mb-4 p-4 border rounded-xl bg-gray-50">
            <div className="font-semibold mb-2">
              {shift.name}
            </div>

            {shift.tables.map((t, j) => (
              <div key={j} className="flex justify-between text-sm">
                <span>{t.capacity} personas</span>
                <span>{t.quantity} mesas</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
