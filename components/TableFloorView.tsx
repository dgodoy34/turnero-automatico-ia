"use client";

import { useEffect, useState } from "react";
import { generateTimeSlots } from "@/lib/generateTimeSlots";
import type { Appointment } from "@/types/Appointment";   // ← Importamos el tipo real

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

  // Cargar mesas desde la API
  async function loadTables() {
    if (!date) return;

    try {
      console.log("🚀 Cargando mesas para fecha:", date);

      const res = await fetch(`/api/table-inventory?date=${date}`, {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log("🔥 RESPUESTA API mesas:", data);

      setTables(data.tables || []);
    } catch (err) {
      console.error("💥 Error cargando mesas:", err);
      setTables([]);
    }
  }

  // Cargar horarios del restaurante
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
      console.error("Error cargando settings:", err);
    }
  }

  // Efectos
  useEffect(() => {
    console.log("TableFloorView montado con date:", date);
    loadTables();
  }, [date]);

  useEffect(() => {
    loadSettings();
  }, []);

  // Filtrar reservas para una hora específica
  function reservationsAtHour(time: string) {
    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const slotStart = new Date(`${date}T${time}:00`);
      const appointmentStart = new Date(`${date}T${a.start_time}`);
      const appointmentEnd = new Date(`${date}T${a.end_time}`);

      return slotStart >= appointmentStart && slotStart < appointmentEnd;
    });
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-4 text-xl">Plano de mesas</h2>

      <div className="mb-6 text-sm text-gray-600">
        Fecha: <strong>{date}</strong> — Mesas totales: <strong>{tables.length}</strong>
      </div>

      {tables.length === 0 ? (
        <div className="text-red-500 p-6 border border-red-200 rounded-lg text-center">
          ⚠️ No hay mesas configuradas para esta fecha
        </div>
      ) : (
        <div className="space-y-8">
          {hours.map((hour) => {
            const reservationsThisHour = reservationsAtHour(hour);

            return (
              <div key={hour} className="border rounded-xl p-6 bg-gray-50">
                <div className="font-semibold text-lg mb-4 flex items-center gap-2">
                  🕒 {hour}
                  <span className="text-sm font-normal text-gray-500">
                    ({reservationsThisHour.length} reservas)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tables.flatMap((tableType) =>
                    Array.from({ length: tableType.quantity }).map((_, index) => {
                      const reservation = reservationsThisHour.find(
                        (r) => r.assigned_table_capacity === tableType.capacity
                      );

                      let status = "Libre";
                      let color = "bg-emerald-100 border-emerald-500 text-emerald-700";
                      let icon = "🟢";

                      if (reservation) {
                        if (reservation.status === "confirmed") {
                          status = "Reservada";
                          color = "bg-amber-100 border-amber-500 text-amber-700";
                          icon = "🟡";
                        } else {
                          status = "Ocupada";
                          color = "bg-red-100 border-red-500 text-red-700";
                          icon = "🔴";
                        }
                      }

                      return (
                        <div
                          key={`${tableType.capacity}-${index}-${hour}`}
                          className={`p-5 rounded-xl border-2 text-center transition-all ${color}`}
                        >
                          <div className="text-3xl mb-2">{icon}</div>
                          <div className="font-bold text-lg">
                            Mesa {tableType.capacity} personas
                          </div>
                          <div className="text-sm mt-1 font-medium">{status}</div>

                          {reservation && (
                            <div className="text-xs mt-3 opacity-75">
                              {reservation.people} pax • {reservation.clients?.name || "Cliente"}
                            </div>
                          )}
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