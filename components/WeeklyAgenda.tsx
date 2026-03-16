"use client";

import { useMemo, useState } from "react";
import type { Appointment, AppointmentStatus } from "@/types/Appointment";

function statusColor(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100";
    case "completed":
      return "bg-gray-200";
    case "cancelled":
      return "bg-red-100";
    case "no_show":
      return "bg-amber-100";
    default:
      return "bg-white";
  }
}

export default function WeeklyAgenda({
  appointments,
  onDelete,
  onStatusChange,
}: {
  appointments: Appointment[];
  onDelete: (id: number) => Promise<void>;
  onStatusChange: (id: number, status: AppointmentStatus) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Appointment | null>(null);

  const sorted = useMemo(
    () =>
      [...appointments].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      ),
    [appointments]
  );

  return (
    <>
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-6">
          Agenda Completa
        </h2>

        <div className="space-y-4">
          {sorted.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-xl cursor-pointer transition hover:shadow ${statusColor(
                a.status
              )}`}
              onClick={() => setSelected(a)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {a.date} • {a.time} — {a.people} personas
                  </div>

                  <div className="text-sm text-gray-700 mt-1">
                    {a.clients?.name || `DNI ${a.client_dni}`}
                  </div>

                  <div className="text-xs text-gray-500">
                    Código: {a.reservation_code}
                  </div>
                </div>

                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={a.status}
                    onChange={(e) =>
                      onStatusChange(
                        a.id,
                        e.target.value as AppointmentStatus
                      )
                    }
                    className="border rounded px-3 py-1"
                  >
                    <option value="confirmed">
                      Confirmada
                    </option>
                    <option value="completed">
                      Check-in
                    </option>
                    <option value="cancelled">
                      Cancelada
                    </option>
                    <option value="no_show">
                      No-show
                    </option>
                  </select>

                  <button
                    onClick={() => onDelete(a.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL DETALLE RESERVA */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">
              Reserva {selected.reservation_code}
            </h3>

            <div className="space-y-2 text-sm">
              <div>
                <strong>Fecha:</strong> {selected.date}
              </div>
              <div>
                <strong>Hora:</strong> {selected.time}
              </div>
              <div>
                <strong>Personas:</strong> {selected.people}
              </div>

              <hr />

              <div>
                <strong>Cliente:</strong>{" "}
                {selected.clients?.name}
              </div>

              <div>DNI: {(selected.clients as any)?.dni}</div>

              {selected.clients?.email && (
                <div>Email: {selected.clients.email}</div>
              )}

              {selected.clients?.phone && (
                <div>Tel: {selected.clients.phone}</div>
              )}

              {selected.notes && (
                <>
                  <hr />
                  <div>
                    <strong>Notas:</strong>
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {selected.notes}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}