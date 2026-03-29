"use client";

import { useEffect, useState } from "react";
import type { Appointment } from "@/types/Appointment";

type TableType = {
  capacity: number;
  quantity: number;
};

type Props = {
  appointments?: Appointment[];
  date: string;
};

export default function TableFloorView({ appointments = [], date }: Props) {
  const [tables, setTables] = useState<TableType[]>([]);

  async function loadTables() {
    if (!date) return;

    try {
      const res = await fetch(`/api/table-inventory?date=${date}`, {
        cache: "no-store",
        next: { revalidate: 0 },
      });

      const data = await res.json();
      console.log("Mesas cargadas:", data.tables);
      setTables(data.tables || []);
    } catch (err) {
      console.error("Error mesas:", err);
      setTables([]);
    }
  }

  useEffect(() => {
    loadTables();
  }, [date]);

  // Función simplificada de reservas
  function getReservationsForHour(hour: string) {
    return appointments.filter((a) => 
      a.date === date && 
      a.start_time <= hour && 
      a.end_time > hour
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4 text-xl">Plano de mesas</h2>
        <div className="text-red-500 p-8 text-center border border-red-200 rounded-lg">
          ⚠️ No hay mesas configuradas para esta fecha
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-6 text-2xl">Plano de mesas</h2>

      <div className="mb-8 text-gray-600">
        Fecha: <strong>{date}</strong> — Configuraciones: <strong>{tables.length}</strong>
      </div>

      <div className="space-y-10">
        {tables.map((tableType, idx) => (
          <div key={idx} className="border rounded-2xl p-6 bg-gray-50">
            <h3 className="font-semibold text-lg mb-4">
              Mesas de {tableType.capacity} personas ({tableType.quantity} mesas)
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: tableType.quantity }).map((_, i) => {
                // Por ahora mostramos todas como libres (mejoramos después)
                return (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-center hover:scale-105 transition-all"
                  >
                    <div className="text-4xl mb-3">🟢</div>
                    <div className="font-bold text-xl">Mesa {tableType.capacity}</div>
                    <div className="text-emerald-700 font-medium mt-1">Libre</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}