"use client";

import { useEffect, useState } from "react";
import TableFloorView from "@/components/TableFloorView";
import TableInventoryView from "@/components/TableInventoryView";
import type { Appointment } from "@/types/Appointment";

function todayISO(){
  return new Date().toISOString().split("T")[0];
}

export default function Mesas(){

  const [appointments,setAppointments] = useState<Appointment[]>([]);
  const [date,setDate] = useState(todayISO());

  async function load(){
    const res = await fetch("/api/appointments");
    const data = await res.json();
    setAppointments(data.appointments || []);
  }

  useEffect(()=>{
    load();
  },[]);

  return(

    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Gestión de mesas
      </h1>

      {/* SELECTOR FECHA */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 items-center">

        <label className="font-semibold">
          Servicio del día
        </label>

        <input
          type="date"
          value={date}
          onChange={(e)=>setDate(e.target.value)}
          className="border rounded p-2"
        />

      </div>

      {/* INVENTARIO */}
      <TableInventoryView date={date} />

      {/* PLANO DE MESAS */}
      <TableFloorView
        appointments={appointments}
        date={date}
      />

    </div>

  )
}