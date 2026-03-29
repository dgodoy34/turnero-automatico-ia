"use client";

import { useEffect, useState } from "react";
import TableFloorView from "@/components/TableFloorView";
import TableInventoryView from "@/components/TableInventoryView";
import DailyTableSetup from "@/components/DailyTableSetup";
import type { Appointment } from "@/types/Appointment";

// 🔥 FECHA LOCAL (ARGENTINA)
function todayLocalISO(){
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

export default function Mesas() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(todayLocalISO());
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${date}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [date]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestión de mesas</h1>

      {/* SELECTOR FECHA */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 items-center">
        <label className="font-semibold">Servicio del día</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded p-2"
        />
      </div>

      <TableInventoryView date={date} />
      

      {/* PLANO DE MESAS - Solo una vez */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4 text-xl">Plano de mesas</h2>
        {loading && <p>Cargando reservas...</p>}
        <TableFloorView 
          appointments={appointments} 
          date={date} 
        />
      </div>
    </div>
  );
}