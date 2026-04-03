"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DailyTableSetup from "@/components/DailyTableSetup";

type Settings = {
  open_time: string;
  close_time: string;
  slot_interval: number;
  reservation_duration: number;
  buffer_time: number;
  timezone?: string;
};

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

const RESTAURANT_ID = "f9661b52-312d-46f6-9615-89aecfbb8a09";

export default function Configuracion() {

  const [settings, setSettings] = useState<Settings>({
    open_time: "18:00",
    close_time: "23:30",
    slot_interval: 30,
    reservation_duration: 120,
    buffer_time: 15
  });

  const [saved, setSaved] = useState(false);

  const [shifts, setShifts] = useState<Shift[]>([
    {
      name: "Día",
      start_time: "12:00",
      end_time: "16:00",
      tables: [
        { capacity: 2, quantity: 6 },
        { capacity: 4, quantity: 2 },
        { capacity: 6, quantity: 1 }
      ]
    },
    {
      name: "Noche",
      start_time: "20:00",
      end_time: "23:30",
      tables: [
        { capacity: 2, quantity: 10 },
        { capacity: 4, quantity: 5 },
        { capacity: 6, quantity: 2 }
      ]
    }
  ]);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (e) {
      console.log("No settings yet");
    }
  }

  // ✅ NUEVA FUNCIÓN AGREGADA (FIX)
  async function saveSettings() {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        alert("Error al guardar la configuración");
        return;
      }

      setSaved(true);

      setTimeout(() => setSaved(false), 3000);

      alert("Configuración guardada correctamente");
    } catch (e) {
      console.error(e);
      alert("Error al guardar la configuración");
    }
  }

  async function loadShifts() {
    try {
      const { data, error } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("restaurant_id", RESTAURANT_ID);

      if (error) {
        console.error("Error loadShifts:", error);
        return;
      }

      if (!data || data.length === 0) return;

      const grouped: any = {};

      data.forEach((row: any) => {
        const key = `${row.start_time}-${row.end_time}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: row.start_time < "17:00" ? "Día" : "Noche",
            start_time: row.start_time,
            end_time: row.end_time,
            tables: []
          };
        }
        grouped[key].tables.push({
          capacity: row.capacity,
          quantity: row.quantity
        });
      });

      setShifts(Object.values(grouped));
    } catch (err) {
      console.error("Error en loadShifts:", err);
    }
  }

  async function saveShifts() {
    try {
      await supabase
        .from("restaurant_table_inventory")
        .delete()
        .eq("restaurant_id", RESTAURANT_ID);

      const rows: any[] = [];

      shifts.forEach(shift => {
        shift.tables.forEach(t => {
          rows.push({
            restaurant_id: RESTAURANT_ID,
            date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            capacity: t.capacity,
            quantity: t.quantity
          });
        });
      });

      const { error } = await supabase
        .from("restaurant_table_inventory")
        .insert(rows);

      if (error) throw error;

      alert("Turnos guardados correctamente 🚀");
      loadShifts();
    } catch (err) {
      console.error(err);
      alert("Error al guardar turnos");
    }
  }

  async function handleSaveAll() {
  try {
    await saveSettings();
    await saveShifts();

    alert("Configuración completa guardada 🚀");
  } catch (e) {
    console.error(e);
    alert("Error al guardar configuración");
  }
}

  function updateField(field: string, value: any) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    loadSettings();
    loadShifts();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración del restaurante</h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold">Configuración de mesas por día</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />
        <DailyTableSetup key={date} date={date} />
      </div>

      
      <div className="grid md:grid-cols-2 gap-6">
  {shifts.map((shift, i) => (
    <div key={i} className="border p-4 rounded-xl space-y-4 bg-gray-50">
      
      {/* Título */}
      <h3 className="font-semibold text-lg">
        {shift.name}
      </h3>

      {/* Horarios */}
      <div className="flex gap-2">
        <input
          type="time"
          value={shift.start_time}
          onChange={(e) => {
            const updated = [...shifts];
            updated[i].start_time = e.target.value;
            setShifts(updated);
          }}
          className="border p-2 rounded"
        />

        <input
          type="time"
          value={shift.end_time}
          onChange={(e) => {
            const updated = [...shifts];
            updated[i].end_time = e.target.value;
            setShifts(updated);
          }}
          className="border p-2 rounded"
        />
      </div>

      {/* Mesas */}
      {shift.tables.map((table, j) => (
        <div key={j} className="flex justify-between items-center">
          <span>Mesa {table.capacity}</span>
          <input
            type="number"
            value={table.quantity}
            onChange={(e) => {
              const updated = [...shifts];
              updated[i].tables[j].quantity = Number(e.target.value);
              setShifts(updated);
            }}
            className="border p-2 rounded w-20"
          />
        </div>
      ))}
    </div>
  ))}
</div>
</div>
  );}


