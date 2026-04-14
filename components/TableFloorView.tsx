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
  appointments?: Appointment[];   // ← Agregado
};

export default function TableFloorView({ date, shift, appointments = [] }: Props) {
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const tablesRes = await fetch(`/api/table-inventory?date=${date}&shift=${shift}`);
      const tablesData = await tablesRes.json();

      setTables(tablesData.tables || tablesData || []);
    } catch (err) {
      console.error("Error cargando mesas:", err);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (date) loadData();
  }, [date, shift]);

  function usedTables(capacity: number): number {
    let used = 0;
    const isDay = shift === "Día";

    appointments.forEach((a) => {
      if (a.date !== date) return;
      if (a.status !== "confirmed") return;
      if (!a.assigned_table_capacity || !a.time) return;

      const hour = parseInt(a.time.slice(0, 2));

      if (isDay && (hour < 12 || hour > 16)) return;
      if (!isDay && (hour < 20 || hour > 23)) return;

      if (capacity === 6 && a.assigned_table_capacity >= 6) {
        used += a.tables_used || 1;
      } else if (a.assigned_table_capacity === capacity) {
        used += a.tables_used || 1;
      }
    });

    return used;
  }

  const sortedTables = [...tables].sort((a, b) => {
    if (a.capacity === 6) return 1;
    if (b.capacity === 6) return -1;
    return a.capacity - b.capacity;
  });

  if (loading) return <div className="p-8 text-center">Cargando plano...</div>;

  return (
    <div className="space-y-8">
      {/* Inventario Lineal */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-lg mb-6">Inventario de mesas ({shift})</h2>
        <div className="space-y-4">
          {sortedTables.map((t) => {
            const used = usedTables(t.capacity);
            const free = Math.max(0, t.quantity - used);
            return (
              <div key={t.capacity} className="border rounded-lg p-4 flex justify-between">
                <div>
                  <span className="font-medium">
                    {t.capacity === 6 ? "6+ personas" : `${t.capacity} personas`}
                  </span>
                </div>
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-500">Total: {t.quantity}</span>
                  <span className="text-red-600">Ocupadas: {used}</span>
                  <span className="text-green-600">Libres: {free}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plano Visual */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-lg mb-6">Plano de mesas ({shift})</h2>
        <div className="space-y-8">
          {sortedTables.map((t) => {
            const used = usedTables(t.capacity);
            const is6Plus = t.capacity === 6;

            return (
              <div key={t.capacity} className="space-y-3">
                <h3 className="font-medium">
                  {is6Plus ? "6+ personas" : `${t.capacity} personas`} ({t.quantity})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Array.from({ length: t.quantity }).map((_, index) => {
                    const isOccupied = index < used;
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border text-center font-medium ${
                          isOccupied
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-green-50 border-green-200 text-green-700"
                        }`}
                      >
                        Mesa {is6Plus ? "6+" : t.capacity}
                        <div className="text-xs mt-1">
                          {isOccupied ? "Ocupada" : "Libre"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}