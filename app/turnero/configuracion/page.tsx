"use client";

import { useEffect, useState } from "react";
import DailyTableSetup from "@/components/DailyTableSetup";

type Settings = {
  open_time: string;
  close_time: string;
  slot_interval: number;
  reservation_duration: number;
  buffer_time: number;
};

export default function Configuracion() {

  const [settings,setSettings] = useState<Settings>({
    open_time:"18:00",
    close_time:"23:30",
    slot_interval:30,
    reservation_duration:120,
    buffer_time:15
  });

  const [saved,setSaved] = useState(false);

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

