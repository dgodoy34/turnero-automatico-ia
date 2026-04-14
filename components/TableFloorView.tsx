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
  // Agregamos appointments como prop opcional
  appointments?: Appointment[];
};

export default function TableInventoryView({ date, shift, appointments = [] }: Props) {
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

  // Orden correcto: 2 → 4 → 6+
  const sortedTables = [...tables].sort((a, b) => {
    if (a.capacity === 6) return 1;
    if (b.capacity === 6) return -1;
    return a.capacity - b.capacity;
  });

  if (loading) {
    return <div className="p-8 text-center">Cargando plano de mesas...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold text-lg mb-6">
        Inventario de mesas ({shift})
      </h2>

      {sortedTables.length === 0 ? (
        <p className="text-center py-12 text-gray-500">
          No hay mesas configuradas para este turno.
        </p>
      ) : (
        <div className="space-y-6">
          {sortedTables.map((t) => {
            const used = usedTables(t.capacity);
            const free = Math.max(0, t.quantity - used);

            return (
              <div key={t.capacity} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg">
                    {t.capacity === 6 ? "6+ personas" : `${t.capacity} personas`}
                  </h3>
                  <span className="text-sm text-gray-500">Total: {t.quantity}</span>
                </div>
                <div className="flex gap-6 mt-3 text-sm">
                  <span className="text-red-600">Ocupadas: {used}</span>
                  <span className="text-green-600">Libres: {free}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}