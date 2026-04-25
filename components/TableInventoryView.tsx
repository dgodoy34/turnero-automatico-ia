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
  time?: string;
  start_time?: string;
  end_time?: string;
  people?: number;
};

type Props = {
  date: string;
  shift: string;
  businessId: string;
};

export default function TableInventoryView({ date, shift, businessId }: Props) {
  const [tables, setTables] = useState<TableType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // =========================
  // 🔥 LOAD DATA
  // =========================
  async function loadData() {
  // 🛑 Validamos que tengamos todo antes de pedir
  if (!businessId || !date || !shift) return;

  try {
    // 🔥 PASAMOS LOS PARÁMETROS EN LA URL
    const tablesRes = await fetch(
      `/api/table-inventory?business_id=${businessId}&date=${date}&shift=${shift}`
    );

    if (!tablesRes.ok) {
      console.error("❌ Error en la API de inventario:", await tablesRes.text());
      return;
    }

    const tablesData = await tablesRes.json();

    // Hacemos lo mismo para las reservas (appointments)
    const apptRes = await fetch(
      `/api/appointments?business_id=${businessId}&date=${date}`
    );

    const apptData = await apptRes.json();

    // ✅ Tu API devuelve { success: true, tables: [...] }
    if (tablesData.success) {
      setTables(tablesData.tables || []);
    }
    
    setAppointments(apptData?.appointments || []);
  } catch (err) {
    console.error("💥 Error cargando datos de la vista:", err);
  }
}
  // =========================
  // 🔥 CALCULAR MESAS USADAS
  // =========================
  function usedTables(capacityParam: number) {
    let used = 0;
    const isDay = shift === "Día";

    appointments.forEach((a) => {
      if (a.date?.slice(0, 10) !== date) return;
      if (a.status !== "confirmed") return;

      const rawTime = a.time || a.start_time || a.end_time;
      if (!rawTime) return;

      const hour = parseInt(rawTime.slice(0, 2));

      if (isDay && (hour < 12 || hour >= 17)) return;
      if (!isDay && (hour < 17 || hour > 23)) return;

      const cap = a.assigned_table_capacity || a.people;
      if (!cap) return;

      if (cap >= 6 && capacityParam === 6) {
        used += a.tables_used || 1;
      } else if (cap === capacityParam) {
        used += a.tables_used || 1;
      }
    });

    return used;
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-4">
        Inventario de mesas ({shift})
      </h2>

      <div className="space-y-3">
        {[...tables]
          .sort((a, b) => a.capacity - b.capacity)
          .map((t) => {
            const used = usedTables(t.capacity);
            const free = Math.max(0, t.quantity - used);

            return (
              <div
                key={t.capacity}
                className="flex justify-between items-center border p-3 rounded"
              >
                <div>
                  Mesa {t.capacity === 6 ? "6+" : t.capacity} personas
                </div>

                <div className="flex gap-3 text-sm">
                  <span className="text-gray-500">
                    Total: {t.quantity}
                  </span>

                  <span className="text-red-600">
                    Ocupadas: {used}
                  </span>

                  <span className="text-green-600">
                    Libres: {free}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}