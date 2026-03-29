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
      const res = await fetch(`/api/table-inventory?date=${date}`);
      const data = await res.json();

      console.log("🔥 TABLES:", data);

      setTables(data.tables || []);
    } catch (err) {
      console.error("Error cargando mesas", err);
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

      {/* 🔥 SOLO MOSTRAR ERROR SI REALMENTE NO HAY */}
      {tables.length === 0 ? (
        <div className="text-red-500">
          ⚠️ No hay mesas cargadas
        </div>
      ) : (
        <div className="space-y-4">
          {hours.map((h) => {
            const reservations = reservationsAtHour(h);
            let used = 0;

            return (
              <div key={h} className="border p-3 rounded">
                <div className="font-semibold mb-2">{h}</div>

                <div className="grid grid-cols-4 gap-2">
                  {tables.flatMap((t) =>
                    Array.from({ length: t.quantity }).map((_, i) => {
                      const reservation = reservations[used];

                      let color = "bg-green-200 border border-green-500";
                      let label = "🟢 Libre";

                      if (reservation && reservation.assigned_table_capacity === t.capacity) {
                        used++;

                        if (reservation.status === "confirmed") {
                          color = "bg-yellow-200 border border-yellow-500";
                          label = "🟡 Reservada";
                        } else {
                          color = "bg-red-200 border border-red-500";
                          label = "🔴 Ocupada";
                        }
                      }

                      return (
                        <div
                          key={`${t.capacity}-${i}-${h}`}
                          className={`p-2 rounded text-sm ${color}`}
                        >
                          <div className="font-semibold">
                            Mesa {t.capacity}
                          </div>
                          <div className="text-xs">{label}</div>
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