"use client";

import { useEffect, useState } from "react";

type TableType = {
  capacity: number;
  quantity: number;
};

type Appointment = {
  assigned_table_capacity?: number;
  tables_used?: number;
  status: string;
  date: string;
  time: string;
};

type Props = {
  date: string;
  shift: "Día" | "Noche";
};

export default function TableInventoryView({ date, shift }: Props) {
  const [tables, setTables] = useState<TableType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  async function loadData() {
    try {
      const tablesRes = await fetch(`/api/table-inventory?date=${date}&shift=${shift}`);
      const tablesData = await tablesRes.json();

      const apptRes = await fetch("/api/appointments");
      const apptData = await apptRes.json();

      setTables(tablesData.tables || []);
      setAppointments(apptData.appointments || []);
    } catch (error) {
      console.error("Error cargando inventario:", error);
    }
  }

  useEffect(() => {
    if (!date) return;
    loadData();
  }, [date, shift]);

  function usedTables(capacity: number): number {
    let used = 0;
    const isDay = shift === "Día";

    appointments.forEach((a) => {
      if (a.date !== date) return;
      if (a.status !== "confirmed") return;
      if (!a.assigned_table_capacity || !a.time) return;

      const hour = parseInt(a.time.slice(0, 2));

      // Filtro por turno
      if (isDay && (hour < 12 || hour > 16)) return;
      if (!isDay && (hour < 20 || hour > 23)) return;

      // Lógica de capacidad
      if (capacity === 6 && a.assigned_table_capacity >= 6) {
        used += a.tables_used || 1;
      } else if (a.assigned_table_capacity === capacity) {
        used += a.tables_used || 1;
      }
    });

    return used;
  }

  // Orden fijo: 2 → 4 → 6+
  const sortedTables = [...tables].sort((a, b) => {
    if (a.capacity === 6) return 1;
    if (b.capacity === 6) return -1;
    return a.capacity - b.capacity;
  });

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold text-lg mb-6">
        Inventario de mesas ({shift})
      </h2>

      <div className="space-y-6">
        {sortedTables.map((t) => {
          const used = usedTables(t.capacity);
          const free = Math.max(0, t.quantity - used);

          return (
            <div key={t.capacity} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">
                  {t.capacity === 6 ? "6+ personas" : `${t.capacity} personas`}
                </h3>
                <span className="text-sm text-gray-500">Total: {t.quantity}</span>
              </div>

              <div className="flex gap-4 text-sm">
                <span className="text-red-600 font-medium">
                  Ocupadas: {used}
                </span>
                <span className="text-green-600 font-medium">
                  Libres: {free}
                </span>
              </div>
            </div>
          );
        })}

        {sortedTables.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No hay mesas configuradas para este turno.
          </p>
        )}
      </div>
    </div>
  );
}