"use client";

import { useEffect, useState } from "react";
import DailyTableSetup from "@/components/DailyTableSetup";
import { supabase } from "@/lib/supabaseClient";



type Settings = {
  open_time: string
  close_time: string
  slot_interval: number
  reservation_duration: number
  buffer_time: number
  timezone?: string // 👈 AGREGAR ESTO
}

export default function Configuracion() {

  const [settings,setSettings] = useState<Settings>({
    open_time:"18:00",
    close_time:"23:30",
    slot_interval:30,
    reservation_duration:120,
    buffer_time:15
  });

  const [saved,setSaved] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);

  // 🔥 NUEVO → fecha para config diaria
  const [date,setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function loadSettings(){
    try{
      const res = await fetch("/api/settings");
      if(!res.ok) return;

      const data = await res.json();

      if(data.settings){
        setSettings(data.settings);
      }

    }catch(e){
      console.log("no settings yet");
    }
  }

  useEffect(()=>{
    loadSettings();
  },[]);

  useEffect(()=>{
  loadSettings();
  loadShifts();
},[]);

  async function saveSettings(){
    setSaved(false);

    await fetch("/api/settings",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(settings)
    });

    setSaved(true);
  }

  async function loadShifts() {
  const { data } = await supabase
    .from("restaurant_table_schedule")
    .select("*");

  if (data) setShifts(data);
}

async function saveShifts() {

  await supabase
    .from("restaurant_table_schedule")
    .delete();

  const toInsert = shifts.map(s => ({
    ...s,
    restaurant_id: "1" // ⚠️ después lo hacemos dinámico
  }));

  await supabase
    .from("restaurant_table_schedule")
    .insert(toInsert);

  alert("Turnos guardados 🚀");
}

  function updateField(field:string,value:any){
    setSettings(prev=>({
      ...prev,
      [field]:value
    }));
  }

  return(

    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Configuración del restaurante
      </h1>

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
        { start_time: "12:00", end_time: "16:00", capacity: 2, quantity: 6 }
      ])}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      🌞 Día
    </button>

    <button
      onClick={() => setShifts([
        { start_time: "20:00", end_time: "23:30", capacity: 2, quantity: 10 }
      ])}
      className="bg-purple-600 text-white px-4 py-2 rounded"
    >
      🌙 Noche
    </button>

    <button
      onClick={() => setShifts([
        { start_time: "12:00", end_time: "16:00", capacity: 2, quantity: 6 },
        { start_time: "20:00", end_time: "23:30", capacity: 2, quantity: 10 }
      ])}
      className="bg-indigo-600 text-white px-4 py-2 rounded"
    >
      Día + Noche
    </button>

  </div>

  {shifts.map((shift, i) => (
    <div key={i} className="border p-3 rounded flex gap-3">

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

      <input
        type="number"
        value={shift.capacity}
        onChange={(e)=>{
          const updated = [...shifts];
          updated[i].capacity = Number(e.target.value);
          setShifts(updated);
        }}
        className="border p-2 rounded w-20"
      />

      <input
        type="number"
        value={shift.quantity}
        onChange={(e)=>{
          const updated = [...shifts];
          updated[i].quantity = Number(e.target.value);
          setShifts(updated);
        }}
        className="border p-2 rounded w-20"
      />

    </div>
  ))}

  <button
    onClick={saveShifts}
    className="bg-green-600 text-white px-6 py-2 rounded"
  >
    Guardar turnos
  </button>

</div>

      {/* 🔹 CONFIG MESAS POR DÍA */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">

        <h2 className="font-semibold">
          Configuración de mesas por día
        </h2>

        {/* 🔥 SELECTOR DE FECHA */}
        <input
          type="date"
          value={date}
          onChange={(e)=>setDate(e.target.value)}
          className="border p-2 rounded"
        />

        {/* 🔥 COMPONENTE CON FECHA */}
        <DailyTableSetup date={date} />

      </div>

    </div>

  );
}

