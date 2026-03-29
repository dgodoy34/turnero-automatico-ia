"use client";

import { useEffect, useState } from "react";
import DailyTableSetup from "@/components/DailyTableSetup";
import { supabase } from "@/lib/supabaseClient";

type Settings = {
  open_time: string;
  close_time: string;
  slot_interval: number;
  reservation_duration: number;
  buffer_time: number;
  timezone?: string;
};

// 🔥 TIPOS NUEVOS (CLAVE)
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

  const [settings, setSettings] = useState<Settings>({
    open_time: "18:00",
    close_time: "23:30",
    slot_interval: 30,
    reservation_duration: 120,
    buffer_time: 15
  });

  const [saved, setSaved] = useState(false);

  // ✅ TIPADO CORRECTO
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

  // 🔥 fecha config
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;

      const data = await res.json();

      if (data.settings) {
        setSettings(data.settings);
      }

    } catch (e) {
      console.log("no settings yet");
    }
  }


  useEffect(() => {
    loadSettings();
    loadShifts();
  }, []);

  async function saveSettings() {
    setSaved(false);

    await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(settings)
    });

    setSaved(true);
  }

  async function loadShifts() {
  const { data } = await supabase
    .from("restaurant_table_inventory")
    .select("*")
    .eq("restaurant_id", "1")
   

  if (!data || data.length === 0) return;

  // agrupar por turno
  const grouped: any = {};

  data.forEach((row) => {
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
}

  async function saveShifts() {

    await supabase
      .from("restaurant_table_inventory")
      .delete()
      .eq("restaurant_id", "1")
     
    const rows: any[] = [];

    shifts.forEach(shift => {
      shift.tables.forEach(t => {
        rows.push({
          restaurant_id: "1",
          date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          capacity: t.capacity,
          quantity: t.quantity
        });
      });
    });

    await supabase
      .from("restaurant_table_inventory")
      .insert(rows);

    console.log("INSERT:", rows);

    alert("Turnos guardados 🚀");
  }

  function updateField(field: string, value: any) {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }

  return (

    

    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Configuración del restaurante
      </h1>

      {/* 🔹 CONFIG MESAS POR DÍA */}

<div className="bg-white rounded-xl shadow p-6 space-y-4">

  <h2 className="font-semibold">
    Configuración de mesas por día
  </h2>

  <input
    type="date"
    value={date}
    onChange={(e)=>setDate(e.target.value)}
    className="border p-2 rounded"
  />

  <DailyTableSetup key={date} date={date} />

</div>

      {/* 🔹 CONFIG GENERAL */}
      <div className="bg-white rounded-xl shadow p-6 space-y-6">

        {/* HORARIOS */}
        <div className="grid grid-cols-2 gap-6">

          <div>
            <label className="block text-sm font-semibold mb-1">
              Hora apertura
            </label>

            <input
              type="time"
              value={settings.open_time}
              onChange={(e)=>updateField("open_time",e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Hora cierre
            </label>

            <input
              type="time"
              value={settings.close_time}
              onChange={(e)=>updateField("close_time",e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

        </div>

        {/* INTERVALOS */}
        <div className="grid grid-cols-3 gap-6">

          <div>
            <label className="block text-sm font-semibold mb-1">
              Intervalo reservas (min)
            </label>

            <input
              type="number"
              value={settings.slot_interval}
              onChange={(e)=>updateField("slot_interval",Number(e.target.value))}
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Duración reserva (min)
            </label>

            <input
              type="number"
              value={settings.reservation_duration}
              onChange={(e)=>updateField("reservation_duration",Number(e.target.value))}
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Buffer entre mesas (min)
            </label>

            <input
              type="number"
              value={settings.buffer_time}
              onChange={(e)=>updateField("buffer_time",Number(e.target.value))}
              className="border rounded p-2 w-full"
            />
          </div>

        </div>

        {/* ZONA HORARIA */}

<div>

  <label className="block text-sm font-semibold mb-1">
    Zona horaria
  </label>

  <select
    value={settings.timezone || "America/Argentina/Buenos_Aires"}
    onChange={(e)=>updateField("timezone", e.target.value)}
    className="border rounded p-2 w-full"
  >
    <option value="America/Argentina/Buenos_Aires">Argentina</option>
    <option value="America/Santiago">Chile</option>
    <option value="America/Sao_Paulo">Brasil</option>
    <option value="America/Mexico_City">México</option>
    <option value="Europe/Madrid">España</option>
  </select>

</div>

        {/* BOTON */}
        <div className="flex gap-4 items-center pt-4">

          <button
            onClick={saveSettings}
            className="bg-indigo-600 text-white px-6 py-2 rounded"
          >
            Guardar configuración
          </button>

          {saved && (
            <span className="text-green-600">
              Configuración guardada
            </span>
          )}

        </div>

      </div>

      {/* 🔥 CONFIGURACIÓN DE TURNOS */}

<div className="bg-white rounded-xl shadow p-6 space-y-4">

  <h2 className="font-semibold">
    Turnos del restaurante (día / noche)
  </h2>

  <div className="flex gap-3">

    <button
      onClick={() => setShifts([
        {
          name: "Día",
          start_time: "12:00",
          end_time: "16:00",
          tables: [
            { capacity: 2, quantity: 6 },
            { capacity: 4, quantity: 2 },
            { capacity: 6, quantity: 1 }
          ]
        }
      ])}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      🌞 Día
    </button>

    <button
      onClick={() => setShifts([
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
      ])}
      className="bg-purple-600 text-white px-4 py-2 rounded"
    >
      🌙 Noche
    </button>

    <button
      onClick={() => setShifts([
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
      ])}
      className="bg-indigo-600 text-white px-4 py-2 rounded"
    >
      Día + Noche
    </button>

  </div>

  {shifts.map((shift, i) => (
    <div key={i} className="border p-3 rounded space-y-3">

      {/* 🔹 HORARIO */}
      <div className="flex gap-2">
        <input
          type="time"
          value={shift.start_time}
          onChange={(e)=>{
            const updated = [...shifts];
            updated[i].start_time = e.target.value;
            setShifts(updated);
          }}
          className="border p-2 rounded"
        />

        <input
          type="time"
          value={shift.end_time}
          onChange={(e)=>{
            const updated = [...shifts];
            updated[i].end_time = e.target.value;
            setShifts(updated);
          }}
          className="border p-2 rounded"
        />
      </div>

      {/* 🔥 MESAS POR TURNO */}
      {shift.tables.map((table, j) => (
        <div key={j} className="flex gap-2 items-center">

          <span className="w-24">
            Mesa {table.capacity}
          </span>

          <input
            type="number"
            value={table.quantity}
            onChange={(e)=>{
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

  <button
    onClick={saveShifts}
    className="bg-green-600 text-white px-6 py-2 rounded"
  >
    Guardar turnos
  </button>

</div>
    </div>
  );
}

