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


  async function loadData() {
  // Guard estricto: bloquea string vacío, undefined, null
  if (!businessId || businessId.trim() === "" || !date) {
    console.warn("⏭️ loadData abortado:", { businessId, date, shift });
    return;
  }
  setLoading(true);
 // async function loadData() {
  //if (!businessId || !date) {
    //console.warn("⏭️ loadData abortado: falta businessId o date", { businessId, date });
   // return;
 // }
  //setLoading(true);

  useEffect(() => {
  loadData();
}, [businessId, date, shift]);


  try {
    const url = `/api/table-inventory?business_id=${encodeURIComponent(businessId)}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`;
    console.log("📡 GET", url);

    const res = await fetch(url);
    const tablesData = await res.json();

    if (!res.ok) {
      console.error("❌ Error API Inventory:", tablesData);
      setTables([]);
      setAppointments([]);
      return;
    }

    console.log("✅ Inventory respuesta:", tablesData);

    const apptUrl = `/api/appointments?business_id=${encodeURIComponent(businessId)}&date=${encodeURIComponent(date)}`;
    console.log("📡 GET", apptUrl);

    const apptRes = await fetch(apptUrl);
    const apptData = await apptRes.json();

    if (!apptRes.ok) {
      console.error("❌ Error API Appointments:", apptData);
    }

    // Tolerar varias formas de respuesta
    const tablesList = Array.isArray(tablesData)
      ? tablesData
      : tablesData?.tables ?? tablesData?.items ?? [];

    const apptList = Array.isArray(apptData)
      ? apptData
      : apptData?.appointments ?? apptData?.items ?? [];

    console.log("✅ Mesas:", tablesList.length, "| Reservas:", apptList.length);

    setTables(tablesList);
    setAppointments(apptList);
  } catch (err) {
    console.error("💥 Error cargando datos de inventario:", err);
    setTables([]);
    setAppointments([]);
  } finally {
    setLoading(false);
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
  if (loading) return <div className="p-6 text-gray-400 italic">Actualizando inventario...</div>;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-4 text-gray-800">
        Inventario de mesas ({shift})
      </h2>

      <div className="space-y-3">
        {tables.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4">
            No hay configuración de mesas para este turno.
          </p>
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
                  <div className="font-medium">
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