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
  const [loading, setLoading] = useState(false);

  // =========================
  // 🔥 FUNCIÓN DE CARGA
  // =========================
  async function loadData() {
    // Si no hay businessId, no hacemos la petición para evitar errores 400/404
    if (!businessId) return;

    setLoading(true);
    try {
      // 1. Cargamos el inventario de mesas para ese turno y fecha
      const tablesRes = await fetch(
  `/api/table-inventory?business_id=${businessId}&date=${date}&shift=${shift}`
);

      if (!tablesRes.ok) {
        console.error("❌ Error en la API de inventario:", await tablesRes.text());
        return;
      }

      const tablesData = await tablesRes.json();

      // 2. Cargamos las citas/reservas para calcular la ocupación real
      const apptRes = await fetch(
  `/api/appointments?business_id=${businessId}&date=${date}`
);

      const apptData = await apptRes.json();

      // ✅ Actualizamos estados
      if (tablesData.success) {
        setTables(tablesData.tables || []);
      }
      setAppointments(apptData?.appointments || []);
      
    } catch (err) {
      console.error("💥 Error cargando datos de inventario:", err);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // ✅ EL DISPARADOR (Lo que hacía que no trajera nada)
  // ==========================================================
  useEffect(() => {
    loadData();
  }, [date, shift, businessId]);

  // =========================
  // 🔥 LÓGICA DE CÁLCULO
  // =========================
  function usedTables(capacityParam: number) {
    let used = 0;
    const isDay = shift === "Día";

    appointments.forEach((a) => {
      // Solo contamos las confirmadas del día seleccionado
      if (a.date?.slice(0, 10) !== date) return;
      if (a.status !== "confirmed") return;

      // Normalizamos el tiempo de la reserva
      const rawTime = a.time || a.start_time || a.end_time;
      if (!rawTime) return;

      const hour = parseInt(rawTime.slice(0, 2));

      // Filtro de turno manual para mayor precisión
      if (isDay && (hour < 12 || hour >= 17)) return;
      if (!isDay && (hour < 17 || hour > 23)) return;

      const cap = a.assigned_table_capacity || a.people;
      if (!cap) return;

      // Lógica de 6+ personas o match exacto de capacidad
      if (cap >= 6 && capacityParam === 6) {
        used += a.tables_used || 1;
      } else if (cap === capacityParam) {
        used += a.tables_used || 1;
      }
    });

    return used;
  }

  // =========================
  // UI / RENDER
  // =========================
  if (loading) return <div className="p-6 text-gray-500">Actualizando inventario...</div>;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg text-gray-800">
          Inventario de mesas ({shift})
        </h2>
        <span className="text-xs text-gray-400 font-mono">{businessId.slice(0,8)}</span>
      </div>

      <div className="space-y-3">
        {tables.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No hay datos de mesas para este servicio.</p>
        ) : (
          [...tables]
            .sort((a, b) => a.capacity - b.capacity)
            .map((t) => {
              const used = usedTables(t.capacity);
              const free = Math.max(0, t.quantity - used);

              return (
                <div
                  key={t.capacity}
                  className="flex justify-between items-center border p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-700">
                    Mesa {t.capacity === 6 ? "6+" : t.capacity} personas
                  </div>

                  <div className="flex gap-4 text-sm font-semibold">
                    <div className="flex flex-col items-end">
                      <span className="text-gray-400 text-[10px] uppercase">Total</span>
                      <span>{t.quantity}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-red-400 text-[10px] uppercase">Ocupadas</span>
                      <span className="text-red-600">{used}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-green-400 text-[10px] uppercase">Libres</span>
                      <span className="text-green-600">{free}</span>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}