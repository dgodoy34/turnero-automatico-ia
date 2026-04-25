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
  people?: number;
};

type Props = {
  date: string;
  shift: string;
  businessId: string;
};

export default function TableFloorView({ date, shift, businessId }: Props) {
  const [tables, setTables] = useState<TableType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false); // 🔥 Agregado para saber si está cargando

  async function loadData() {
    // 🛑 Si el ID está vacío, no disparamos la petición y avisamos
    if (!businessId || businessId === "") {
      console.warn("⚠️ TableFloorView: Esperando businessId válido...");
      return;
    }

    setLoading(true);
    try {
      // 1. Cargar Inventario de Mesas
      const tablesRes = await fetch(
        `/api/table-inventory?business_id=${businessId}&date=${date}&shift=${shift}`
      );
      const tablesData = await tablesRes.json();

      // 2. Cargar Reservas para calcular ocupación
      const apptRes = await fetch(
        `/api/appointments?business_id=${businessId}&date=${date}`
      );
      const apptData = await apptRes.json();

      if (tablesData.success) {
        setTables(tablesData.tables || []);
      }
      setAppointments(apptData?.appointments || []);
    } catch (err) {
      console.error("💥 Error cargando floor:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [date, shift, businessId]);

  function getUsed(capacity: number) {
    let used = 0;
    const isDay = shift === "Día";

    appointments.forEach((a) => {
      // Filtros de seguridad
      if (a.date?.slice(0, 10) !== date) return;
      if (a.status !== "confirmed") return;

      const rawTime = a.time;
      if (!rawTime) return;

      const hour = parseInt(rawTime.slice(0, 2));
      // Filtro de turno (Día: 12-17hs, Noche: 17-24hs)
      if (isDay && (hour < 12 || hour >= 17)) return;
      if (!isDay && (hour < 17 || hour > 23)) return;

      const cap = a.assigned_table_capacity || a.people || 2;
      
      // Lógica de asignación por capacidad
      if (cap >= 6 && capacity === 6) {
        used += a.tables_used || 1;
      } else if (cap === capacity) {
        used += a.tables_used || 1;
      }
    });
    return used;
  }

  if (loading) return <div className="p-4 text-gray-500 italic">Cargando plano...</div>;

  if (tables.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border rounded text-gray-500">
        No hay mesas configuradas para este turno ({shift}).
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {[...tables]
        .sort((a, b) => a.capacity - b.capacity)
        .map((t) => {
          const used = getUsed(t.capacity);
          return (
            <div key={t.capacity} className="border-b pb-4 last:border-0">
              <h3 className="font-bold text-lg mb-3 flex justify-between">
                <span>Mesas para {t.capacity === 6 ? "6+ personas" : `${t.capacity} personas`}</span>
                <span className="text-sm font-normal text-gray-500">{t.quantity} totales</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: t.quantity }).map((_, i) => {
                  const isOccupied = i < used;
                  return (
                    <div
                      key={i}
                      className={`relative h-16 flex flex-col items-center justify-center border-2 rounded-lg transition-colors ${
                        isOccupied 
                          ? "bg-red-50 border-red-200 text-red-700 shadow-sm" 
                          : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-tighter">
                        {isOccupied ? "Ocupada" : "Libre"}
                      </span>
                      <span className="text-[10px] opacity-60">Mesa {i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}