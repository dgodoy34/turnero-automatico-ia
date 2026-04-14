// force rebuild

"use client";

import { useEffect, useState } from "react";
import TableFloorView from "@/components/TableFloorView";
import TableInventoryView from "@/components/TableInventoryView";
import type { Appointment } from "@/types/Appointment";

// 🔥 FECHA LOCAL (ARGENTINA)
function todayLocalISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

export default function Mesas() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(todayLocalISO());
  const [loading, setLoading] = useState(false);

  // 🔥 TURNO
  const [selectedShift, setSelectedShift] = useState<"Día" | "Noche">("Día");

  // 🔥 SOLO RESERVAS (NO INVENTARIO)
  async function loadAppointments() {
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestión de mesas</h1>

      {/* 🔹 FECHA */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-4 items-center">
        <label className="font-semibold">Servicio del día</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded p-2"
        />
      </div>

      {/* 🔹 SELECTOR TURNO */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedShift("Día")}
          className={`px-4 py-2 rounded ${
            selectedShift === "Día"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Día
        </button>

        <button
          onClick={() => setSelectedShift("Noche")}
          className={`px-4 py-2 rounded ${
            selectedShift === "Noche"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Noche
        </button>
      </div>

      {/* 🔹 INVENTARIO (CORRECTO) */}
      <TableInventoryView 
        date={date} 
        shift={selectedShift} 
      />

      {/* 🔹 PLANO (CORRECTO) */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4 text-xl">Plano de mesas</h2>

        {loading && <p>Cargando mesas...</p>}

        <TableFloorView
          
          date={date}
          shift={selectedShift} // 🔥 CLAVE
        />
      </div>
    </div>
  );
}