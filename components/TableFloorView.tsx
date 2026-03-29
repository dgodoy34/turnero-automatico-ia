"use client";

import { useEffect, useState } from "react";
import { generateTimeSlots } from "@/lib/generateTimeSlots";
import type { Appointment } from "@/types/Appointment";

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

  async function loadTables() {
    if (!date) return;

    try {
      const res = await fetch(`/api/table-inventory?date=${date}`, {
        cache: "no-store",
        next: { revalidate: 0 },
      });

      const data = await res.json();
      console.log("🔥 Mesas cargadas:", data.tables);
      setTables(data.tables || []);
    } catch (err) {
      console.error("Error cargando mesas:", err);
      setTables([]);
    }
  }

  async function loadSettings() {
    try {
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
    } catch (err) {
      console.error("Error settings:", err);
      // Fallback por si falla
      setHours(["12:00", "13:00", "14:00", "20:00", "21:00", "22:00"]);
    }
  }

  useEffect(() => {
    loadTables();
  }, [date]);

  useEffect(() => {
    loadSettings();
  }, []);

  function reservationsAtHour(time: string) {
    return appointments.filter((a) => a.date === date && 
      a.start_time <= time && 
      a.end_time > time
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4 text-xl">Plano de mesas</h2>
        <div className="text-red-500 p-6 text-center">
          ⚠️ No hay mesas configuradas para esta fecha
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-6 text-xl">Plano de mesas</h2>

      <div className="mb-6 text-sm text-gray-600">
        Fecha: <strong>{date}</strong> — Total de configuraciones: <strong>{tables.length}</strong>
      </div>

      <div className="space-y-8">
        {hours.length > 0 ? (
          hours.map((hour) => {
            const reservationsThisHour = reservationsAtHour(hour);

            return (
              <div key={hour} className="border rounded-2xl p-6 bg-gray-50">
                <div className="font-semibold text-lg mb-4 flex items-center gap-3">
                  🕒 {hour}
                  <span className="text-sm text-gray-500">({reservationsThisHour.length} reservas)</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {tables.flatMap((tableType) =>
                    Array.from({ length: tableType.quantity }).map((_, i) => {
                      const reservation = reservationsThisHour.find(
                        (r) => r.assigned_table_capacity === tableType.capacity
                      );

                      const isOccupied = !!reservation;
                      const status = isOccupied 
                        ? (reservation.status === "confirmed" ? "Reservada" : "Ocupada")
                        : "Libre";

                      const color = isOccupied
                        ? reservation.status === "confirmed"
                          ? "bg-amber-100 border-amber-500 text-amber-800"
                          : "bg-red-100 border-red-500 text-red-800"
                        : "bg-emerald-100 border-emerald-500 text-emerald-800";

                      const icon = isOccupied 
                        ? (reservation.status === "confirmed" ? "🟡" : "🔴")
                        : "🟢";

                      return (
                        <div
                          key={`${tableType.capacity}-${i}-${hour}`}
                          className={`p-6 rounded-2xl border-2 text-center ${color}`}
                        >
                          <div className="text-4xl mb-3">{icon}</div>
                          <div className="font-bold text-xl mb-1">
                            {tableType.capacity} personas
                          </div>
                          <div className="font-medium">{status}</div>
                          {reservation && (
                            <div className="text-xs mt-3 text-gray-600">
                              {reservation.people} pax
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500">Cargando horarios...</p>
        )}
      </div>
    </div>
  );
}