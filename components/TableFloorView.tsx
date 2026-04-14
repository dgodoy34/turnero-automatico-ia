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
  people?: number;
};

type Props = {
  date: string;
  shift: "Día" | "Noche";
};

export default function TableFloorView({ date, shift }: Props) {

  const [tables, setTables] = useState<TableType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  async function loadData() {
    const tablesRes = await fetch(`/api/table-inventory?date=${date}&shift=${shift}`);
    const tablesData = await tablesRes.json();

    const apptRes = await fetch("/api/appointments");
    const apptData = await apptRes.json();

    setTables(tablesData.tables || []);
    setAppointments(apptData.appointments || []);
  }

  useEffect(() => {
    if (!date) return;
    loadData();
  }, [date, shift]);

  function getUsed(capacity: number) {
    let used = 0;
    const isDay = shift === "Día";

    appointments.forEach(a => {
      if (a.date !== date) return;
      if (a.status !== "confirmed") return;
      if (!a.time) return;

      const hour = parseInt(a.time.slice(0, 2));

      if (isDay && (hour < 12 || hour >= 17)) return;
      if (!isDay && (hour < 17 || hour > 23)) return;

      const cap = a.assigned_table_capacity || a.people || 2;

      if (cap >= 6 && capacity === 6) {
        used += a.tables_used || 1;
      } else if (cap === capacity) {
        used += a.tables_used || 1;
      }
    });

    return used;
  }

  return (
    <div className="space-y-6">

      {[...tables]
        .sort((a, b) => a.capacity - b.capacity)
        .map(t => {

          const used = getUsed(t.capacity);
          const free = Math.max(0, t.quantity - used);

          return (
            <div key={t.capacity}>
              
              <h3 className="font-semibold mb-2">
                {t.capacity === 6 ? "6+ personas" : `${t.capacity} personas`} ({t.quantity})
              </h3>

              <div className="grid grid-cols-4 gap-3">

                {Array.from({ length: t.quantity }).map((_, i) => {
                  const isOccupied = i < used;

                  return (
                    <div
                      key={i}
                      className={`border rounded p-3 text-center ${
                        isOccupied
                          ? "bg-red-100 border-red-400"
                          : "bg-green-100 border-green-400"
                      }`}
                    >
                      Mesa {t.capacity}
                      <div className="text-xs">
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
  );
}