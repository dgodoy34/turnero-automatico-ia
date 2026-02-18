"use client";

import { useMemo, useState } from "react";

type AppointmentStatus = "Pendiente" | "Confirmado" | "Cancelado" | "Completado";

type Appointment = {
  id: number;
  client_dni: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  date: string;
  time: string;
  service: string;
  notes?: string;
  status: AppointmentStatus;
  created_at?: string;
};

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function prettyDay(date: Date) {
  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
  }).replace(".", "");
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function getStatusColor(status: AppointmentStatus) {
  switch (status) {
    case "Pendiente": return "border-l-4 border-l-amber-500 bg-amber-50/80";
    case "Confirmado": return "border-l-4 border-l-emerald-500 bg-emerald-50/80";
    case "Cancelado": return "border-l-4 border-l-red-500 bg-red-50/80";
    case "Completado": return "border-l-4 border-l-gray-500 bg-gray-50/80";
    default: return "border-l-4 border-l-gray-400 bg-gray-50/60";
  }
}

function getStatusDotColor(status: AppointmentStatus) {
  switch (status) {
    case "Pendiente": return "bg-amber-500";
    case "Confirmado": return "bg-emerald-500";
    case "Cancelado": return "bg-red-500";
    case "Completado": return "bg-gray-500";
    default: return "bg-gray-400";
  }
}

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startMonday = startOfWeekMonday(firstDay);
  const days: Date[] = [];
  let current = new Date(startMonday);

  while (days.length < 42) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  return days;
}

function isSameMonth(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

export default function WeeklyAgenda({
  appointments,
  onDelete,
  onStatusChange,
  onNewForDni,
}: {
  appointments: Appointment[];
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
  onNewForDni?: (dni: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"semanal" | "mensual">("semanal");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<"Todos" | AppointmentStatus>("Todos");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = new Date();
  const todayISO = isoDate(today);

  // Vista semanal
  const monday = useMemo(() => {
    const base = startOfWeekMonday(today);
    return addDays(base, weekOffset * 7);
  }, [weekOffset, today]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const weekDatesISO = useMemo(() => weekDays.map(isoDate), [weekDays]);

  const itemsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    weekDatesISO.forEach(d => map[d] = []);

    appointments.forEach(a => {
      if (weekDatesISO.includes(a.date) && (statusFilter === "Todos" || a.status === statusFilter)) {
        map[a.date].push(a);
      }
    });

    Object.values(map).forEach(list => list.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)));
    return map;
  }, [appointments, weekDatesISO, statusFilter]);

  const PIXELS_PER_HOUR = 50;
  const START_HOUR = 0;
  const END_HOUR = 23;
  const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
  const DAY_HEIGHT_PX = TOTAL_HOURS * PIXELS_PER_HOUR;
  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i), []);

  // Vista mensual
  const monthDays = useMemo(() => getMonthDays(selectedMonth), [selectedMonth]);

  const itemsByMonthDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    monthDays.forEach(d => map[isoDate(d)] = []);

    appointments.forEach(a => {
      if (map[a.date] && (statusFilter === "Todos" || a.status === statusFilter)) {
        map[a.date].push(a);
      }
    });

    Object.values(map).forEach(list => list.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)));
    return map;
  }, [appointments, monthDays, statusFilter]);

  return (
    <section className="bg-white rounded-xl shadow border border-gray-300 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewMode === "semanal" ? "Agenda semanal" : "Agenda mensual"}
          </h2>
          <div className="flex bg-gray-200 rounded-full p-1">
            <button
              onClick={() => setViewMode("semanal")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                viewMode === "semanal" ? "bg-white shadow text-gray-900" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setViewMode("mensual")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                viewMode === "mensual" ? "bg-white shadow text-gray-900" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Mensual
            </button>
          </div>
        </div>

        {viewMode === "semanal" ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setWeekOffset(v => v - 1)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800">← Anterior</button>
            <button onClick={() => setWeekOffset(0)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Hoy</button>
            <button onClick={() => setWeekOffset(v => v + 1)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800">Siguiente →</button>
            <select className="h-10 border border-gray-300 rounded px-3 text-sm focus:ring-2 focus:ring-blue-400" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => { const prev = new Date(selectedMonth); prev.setMonth(prev.getMonth() - 1); setSelectedMonth(prev); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800">←</button>
            <span className="font-medium text-gray-900 min-w-[160px] text-center">
              {selectedMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => { const next = new Date(selectedMonth); next.setMonth(next.getMonth() + 1); setSelectedMonth(next); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800">→</button>
            <button onClick={() => setSelectedMonth(new Date())} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Mes actual</button>
            <select className="h-10 border border-gray-300 rounded px-3 text-sm focus:ring-2 focus:ring-blue-400" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
        )}
      </div>

      {viewMode === "semanal" ? (
        <>
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-gray-50">
            <div className="border-r border-gray-300" />
            {weekDays.map(day => {
              const isToday = isoDate(day) === todayISO;
              return (
                <div key={isoDate(day)} className={`py-3 text-center border-r border-gray-300 last:border-r-0 ${isToday ? "bg-blue-50" : ""}`}>
                  <div className="text-sm font-semibold">{prettyDay(day)}</div>
                  <div className={`text-lg font-bold ${isToday ? "text-blue-700" : "text-gray-800"}`}>{day.getDate()}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-white">
            <div className="border-r border-gray-300 bg-gray-50/30">
              {hours.map(hour => (
                <div key={hour} className="h-[50px] border-b border-gray-200 text-right pr-2 text-xs text-gray-500 flex items-center justify-end">
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {weekDays.map(day => {
              const dayISO = isoDate(day);
              const list = itemsByDay[dayISO] || [];
              return (
                <div key={dayISO} className="relative border-r border-gray-300 last:border-r-0">
                  <div style={{ height: `${DAY_HEIGHT_PX}px` }} className="relative">
                    {hours.map((_, idx) => (
                      <div key={idx} className="absolute left-0 right-0 border-b border-gray-100" style={{ top: `${idx * PIXELS_PER_HOUR}px` }} />
                    ))}
                    {list.map(a => {
                      const startMin = timeToMinutes(a.time);
                      const topPx = (startMin / 60) * PIXELS_PER_HOUR;
                      const heightPx = (45 / 60) * PIXELS_PER_HOUR;
                      return (
                        <div
                          key={a.id}
                          className={`absolute left-2 right-2 rounded-md shadow border border-gray-200 overflow-hidden cursor-pointer transition-all hover:shadow-lg z-10 ${getStatusColor(a.status)}`}
                          style={{ top: `${topPx}px`, height: `${Math.max(heightPx, 60)}px` }}
                          onClick={() => setSelectedAppointment(a)}
                        >
                          <div className="p-2 text-sm">
                            <div className="font-bold text-gray-900 truncate">{a.client_name || "Paciente"}</div>
                            <div className="text-xs text-gray-700 mt-0.5">DNI {a.client_dni}</div>
                          </div>
                        </div>
                      );
                    })}
                    {list.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic text-sm pointer-events-none">
                        Sin turnos
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 text-center font-medium text-gray-600 mb-3 bg-gray-50 py-3 rounded-t-lg border-b">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
              <div key={d} className="text-sm font-semibold">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, idx) => {
              const dayISO = isoDate(day);
              const list = itemsByMonthDay[dayISO] || [];
              const isCurrentMonth = isSameMonth(day, selectedMonth);
              const isTodayDay = dayISO === todayISO;

              return (
                <div
                  key={idx}
                  className={`
                    min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all text-sm
                    ${isCurrentMonth ? "bg-white" : "bg-gray-50/60 text-gray-400"}
                    ${isTodayDay ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-300" : "border-gray-200 hover:border-blue-300"}
                    ${list.length > 0 ? "hover:ring-2 hover:ring-blue-400" : ""}
                  `}
                  onClick={() => list.length > 0 && setSelectedDay(dayISO)}
                >
                  <div className={`font-bold text-base ${isTodayDay ? "text-blue-700" : isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                    {day.getDate()}
                  </div>

                  {list.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {list.slice(0, 6).map(a => (
                        <div
                          key={a.id}
                          className={`w-3 h-3 rounded-full ${getStatusDotColor(a.status)}`}
                          title={`${a.time} - ${a.client_name || "DNI " + a.client_dni} - ${a.service} (${a.status})`}
                        />
                      ))}
                      {list.length > 6 && (
                        <span className="text-xs text-gray-500 self-center font-medium">+{list.length - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal detalle turno individual (semanal) */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                Turno de {selectedAppointment.client_name || `DNI ${selectedAppointment.client_dni}`}
              </h3>
              <button onClick={() => setSelectedAppointment(null)} className="text-gray-500 hover:text-gray-800 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p><strong>Hora:</strong> {selectedAppointment.time}</p>
              <p><strong>Servicio:</strong> {selectedAppointment.service}</p>
              {selectedAppointment.client_phone && <p><strong>Teléfono:</strong> {selectedAppointment.client_phone}</p>}
              {selectedAppointment.client_email && <p><strong>Email:</strong> {selectedAppointment.client_email}</p>}
              {selectedAppointment.notes && <p><strong>Notas:</strong> {selectedAppointment.notes}</p>}
              <p>
                <strong>Estado:</strong>{" "}
                <select
                  className={`ml-2 rounded px-3 py-1.5 text-sm border ${
                    selectedAppointment.status === "Pendiente" ? "bg-amber-100 text-amber-800 border-amber-300" :
                    selectedAppointment.status === "Confirmado" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                    selectedAppointment.status === "Cancelado" ? "bg-red-100 text-red-800 border-red-300" :
                    "bg-gray-100 text-gray-800 border-gray-300"
                  }`}
                  value={selectedAppointment.status}
                  onChange={e => onStatusChange(selectedAppointment.id, e.target.value as AppointmentStatus)}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Completado">Completado</option>
                </select>
              </p>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => { onDelete(selectedAppointment.id); setSelectedAppointment(null); }} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Eliminar
              </button>
              {onNewForDni && (
                <button onClick={() => { onNewForDni(selectedAppointment.client_dni); setSelectedAppointment(null); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  + Nuevo turno
                </button>
              )}
              <button onClick={() => setSelectedAppointment(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lista de turnos del día (mensual) */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                Turnos del {new Date(selectedDay).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                <span className="ml-3 text-gray-500 text-lg">({(itemsByMonthDay[selectedDay] || []).length} turnos)</span>
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-3xl text-gray-500 hover:text-gray-800">×</button>
            </div>

            <div className="p-5 space-y-4">
              {(itemsByMonthDay[selectedDay] || []).map(a => (
                <div key={a.id} className={`p-4 rounded-lg border-l-4 ${getStatusColor(a.status)} shadow-sm hover:shadow-md transition`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-lg text-gray-900">
                        {a.time} – {a.service}
                      </div>
                      <div className="text-gray-800 mt-1 font-medium">
                        {a.client_name || "Paciente"} – DNI {a.client_dni}
                      </div>
                      {a.client_phone && <div className="text-gray-600 text-sm mt-0.5">Tel: {a.client_phone}</div>}
                      {a.client_email && <div className="text-gray-600 text-sm mt-0.5">Email: {a.client_email}</div>}
                      {a.notes && (
                        <div className="mt-3 text-sm text-gray-600 border-t pt-2">
                          <strong>Notas:</strong> {a.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <select
                        className={`rounded px-3 py-1.5 text-sm font-medium border min-w-[140px] ${
                          a.status === "Pendiente" ? "bg-amber-100 text-amber-800 border-amber-300" :
                          a.status === "Confirmado" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                          a.status === "Cancelado" ? "bg-red-100 text-red-800 border-red-300" :
                          "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
                        value={a.status}
                        onChange={e => onStatusChange(a.id, e.target.value as AppointmentStatus)}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="Cancelado">Cancelado</option>
                        <option value="Completado">Completado</option>
                      </select>

                      <button
                        onClick={() => onDelete(a.id)}
                        className="px-4 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(itemsByMonthDay[selectedDay] || []).length === 0 && (
                <div className="text-center text-gray-500 py-10 italic">No hay turnos este día</div>
              )}
            </div>

            <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setSelectedDay(null)} className="px-5 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                Cerrar
              </button>
              {onNewForDni && (
                <button
                  onClick={() => {
                    // Podés implementar aquí el nuevo turno para esta fecha
                    console.log("Nuevo turno para fecha:", selectedDay);
                    // Ejemplo: onNewForDni + fecha
                  }}
                  className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Nuevo turno
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}