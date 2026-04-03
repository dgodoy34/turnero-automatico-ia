"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  const [savedShifts, setSavedShifts] = useState<Shift[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedShift, setSelectedShift] = useState<"Día" | "Noche">("Día");

  const currentShift = shifts.find(s => s.name === selectedShift);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch {}
  }

  async function saveSettings() {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
    } catch {}
  }

  async function loadShifts() {
    try {
      const { data } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("restaurant_id", RESTAURANT_ID);

      if (!data || data.length === 0) return;

      const grouped: any = {};

      data.forEach((row: any) => {
        const key = `${row.start_time}-${row.end_time}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: row.start_time <= "16:00" ? "Día" : "Noche",
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

      const result = Object.values(grouped) as Shift[];
      setSavedShifts(result);
      setShifts(result);
    } catch (e) {
      console.error(e);
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

      await supabase.from("restaurant_table_inventory").insert(rows);

      alert("Configuración guardada 🚀");
      loadShifts();
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    }
  }

  async function handleSaveAll() {
    await saveSettings();
    await saveShifts();
  }

  useEffect(() => {
    loadSettings();
    loadShifts();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración del restaurante</h1>

      {/* CONFIG */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold">Configuración por día</h2>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />

        {/* selector */}
        <div className="flex gap-2">
          {["Día", "Noche"].map(s => (
            <button
              key={s}
              onClick={() => setSelectedShift(s as any)}
              className={`px-4 py-2 rounded ${
                selectedShift === s ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* editor */}
        {currentShift && (
          <div className="space-y-3">
            {currentShift.tables.map((table, i) => (
              <div key={i} className="flex justify-between border p-3 rounded">
                <span>Mesa {table.capacity}</span>
                <input
                  type="number"
                  value={table.quantity}
                  onChange={(e) => {
                    const updated = [...shifts];
                    const idx = shifts.findIndex(s => s.name === selectedShift);
                    updated[idx].tables[i].quantity = Number(e.target.value);
                    setShifts(updated);
                  }}
                  className="border p-2 w-24 rounded"
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSaveAll}
          className="bg-indigo-600 text-white px-6 py-2 rounded"
        >
          Guardar configuración
        </button>
      </div>

      {/* VISTA GUARDADA */}
      <div className="grid md:grid-cols-2 gap-6">
        {savedShifts.map((shift, i) => (
          <div key={i} className="border p-4 rounded-xl bg-gray-50">
            <h3 className="font-semibold mb-2">{shift.name}</h3>
            {shift.tables.map((t, j) => (
              <div key={j} className="flex justify-between">
                <span>Mesa {t.capacity}</span>
                <span>{t.quantity}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

