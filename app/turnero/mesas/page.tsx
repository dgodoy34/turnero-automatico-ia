"use client";

import { useEffect, useState } from "react";
import TableFloorView from "@/components/TableFloorView";
import TableInventoryView from "@/components/TableInventoryView";
import type { Appointment } from "@/types/Appointment";

function todayLocalISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

export default function Mesas() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(todayLocalISO());
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // 🔥 Nuevo estado

  const [selectedShift, setSelectedShift] = useState<"Día" | "Noche">("Día");

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Error settings");
        
        const data = await res.json();
        if (data?.business_id) {
          setBusinessId(data.business_id);
        }
      } catch (err) {
        console.error("💥 Error cargando business:", err);
      } finally {
        setIsInitializing(false); // ✅ Terminó de intentar cargar el ID
      }
    };
    loadBusiness();
  }, []);

  if (isInitializing) {
    return <div className="p-8 text-center">Cargando configuración del restaurante...</div>;
  }

  if (!businessId) {
    return (
      <div className="p-8 text-center text-red-500">
        Error: No se pudo identificar el restaurante. Revisa la consola.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestión de mesas</h1>

      <div className="bg-white rounded-xl shadow p-4 flex gap-4 items-center">
        <label className="font-semibold">Servicio del día</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded p-2"
        />
      </div>

      <div className="flex gap-2">
        {["Día", "Noche"].map((s) => (
          <button
            key={s}
            onClick={() => setSelectedShift(s as "Día" | "Noche")}
            className={`px-4 py-2 rounded ${
              selectedShift === s ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 🔹 INVENTARIO - Ahora garantizamos que businessId existe */}
      <TableInventoryView 
        date={date} 
        shift={selectedShift}
        businessId={businessId}
      />

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4 text-xl">Plano de mesas</h2>
        <TableFloorView
          date={date}
          shift={selectedShift}
          businessId={businessId}
        />
      </div>
    </div>
  );
}