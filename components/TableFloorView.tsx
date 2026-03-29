"use client";

import { useEffect, useState } from "react";
import { generateTimeSlots } from "@/lib/generateTimeSlots";

type Appointment = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  people: number;
  assigned_table_capacity?: number;
  status: string;
};

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
  const [hours, setHours] = useState<string[]>([]);

  // ✅ 🔥 FIX REAL: usar date
async function loadTables() {
  try {
    console.log("🚀 Cargando mesas para fecha:", date);
    
    const res = await fetch(`/api/table-inventory?date=${date}`);
    const data = await res.json();

    console.log("🔥 RESPUESTA COMPLETA DE LA API:", data);
    console.log("🔥 TABLES recibidas:", data.tables);

    if (!data.success) {
      console.error("❌ API devolvió error:", data.error);
    }

    setTables(data.tables || []);
  } catch (err) {
    console.error("💥 Error en fetch de mesas:", err);
    setTables([]);
  }
}

  async function loadSettings() {
    const res = await fetch("/api/settings");
    const data = await res.json();

    const open = data?.settings?.open_time || "12:00";
    const close = data?.settings?.close_time || "23:30";
    const interval = data?.settings?.slot_interval || 30;

    const slots = generateTimeSlots({
      open_time: open,
      close_time: close,
      slot_interval: interval,
    });

    setHours(slots);
  }

  useEffect(() => {
    if (date) loadTables();
  }, [date]);

  useEffect(() => {
    loadSettings();
  }, []);

  function reservationsAtHour(time: string) {
    const slot = new Date(`${date}T${time}:00`);

    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const start = new Date(`${date}T${a.start_time}`);
      const end = new Date(`${date}T${a.end_time}`);

      return slot >= start && slot < end;
    });
  }

 return (
  <div className="bg-white rounded-xl shadow p-6">
    <h2 className="font-semibold mb-4">Plano de mesas</h2>
    
    <div className="mb-4 text-sm text-gray-600">
      Fecha actual: <strong>{date || "SIN FECHA"}</strong>
    </div>

    <div className="mb-4">
      Mesas recibidas: <strong>{tables.length}</strong>
      <pre className="bg-gray-100 p-3 text-xs mt-2 overflow-auto">
        {JSON.stringify(tables, null, 2)}
      </pre>
    </div>

    {tables.length === 0 ? (
      <div className="text-red-500 p-4 border border-red-200 rounded">
        ⚠️ No hay mesas cargadas para esta fecha
      </div>
    ) : (
      <div className="space-y-6">
        {hours.map((h) => {
          const reservations = reservationsAtHour(h);
          let used = 0;

          return (
            <div key={h} className="border p-4 rounded-lg">
              <div className="font-semibold mb-3 text-lg">{h}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tables.flatMap((t) =>
                  Array.from({ length: t.quantity }).map((_, i) => {
                    const reservation = reservations[used];
                    let color = "bg-green-100 border-green-400 text-green-800";
                    let label = "Libre";

                    if (reservation && reservation.assigned_table_capacity === t.capacity) {
                      used++;
                      if (reservation.status === "confirmed") {
                        color = "bg-yellow-100 border-yellow-400 text-yellow-800";
                        label = "Reservada";
                      } else {
                        color = "bg-red-100 border-red-400 text-red-800";
                        label = "Ocupada";
                      }
                    }

                    return (
                      <div
                        key={`${t.capacity}-${i}-${h}`}
                        className={`p-4 rounded-lg border-2 text-center ${color}`}
                      >
                        <div className="font-bold text-lg">Mesa {t.capacity}p</div>
                        <div className="text-sm mt-1">{label}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
}