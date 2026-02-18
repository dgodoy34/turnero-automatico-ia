"use client";

import { useEffect, useMemo, useState } from "react";
import WeeklyAgenda from "./../../components/WeeklyAgenda";

type Client = {
  dni: string;
  name: string;
  phone: string;
  email?: string;
};

type AppointmentStatus = "Pendiente" | "Confirmado" | "Cancelado" | "Completado";

type Appointment = {
  id: number;
  client_dni: string;
  date: string;
  time: string;
  service: string;
  notes?: string;
  status: AppointmentStatus;
  created_at?: string;
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TurneroUI() {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form cliente
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");

  // Form turno
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");

  // Búsqueda
  const [searchDni, setSearchDni] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | AppointmentStatus>("Todos");

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.dni === clientId.trim());
  }, [clients, clientId]);

  const searchedClient = useMemo(() => {
    return clients.find((c) => c.dni === searchDni.trim());
  }, [clients, searchDni]);

  async function loadAll() {
    setLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/appointments"),
      ]);

      const cData = await cRes.json();
      const aData = await aRes.json();

      setClients(cData.clients || []);
      setAppointments(aData.appointments || []);
    } catch (e) {
      console.error(e);
      alert("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addClient() {
    if (!name.trim() || !phone.trim() || !dni.trim()) {
      alert("Nombre, teléfono y DNI son obligatorios");
      return;
    }

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dni: dni.trim(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data?.error || "Error creando cliente");
      return;
    }

    setName("");
    setPhone("");
    setDni("");
    setEmail("");
    await loadAll();
  }

  async function addAppointment() {
    if (!clientId.trim() || !date || !time || !service.trim()) {
      alert("DNI, fecha, hora y servicio son obligatorios");
      return;
    }

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_dni: clientId.trim(),
        date,
        time,
        service: service.trim(),
        notes: notes.trim() || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data?.error || "Error creando turno");
      return;
    }

    setClientId("");
    setDate("");
    setTime("");
    setService("");
    setNotes("");
    await loadAll();
  }

  async function deleteClient(id: string) {
    if (!confirm("¿Seguro que querés borrar este cliente?")) return;

    const res = await fetch(`/api/clients?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data?.error || "Error borrando cliente");
      return;
    }

    await loadAll();
  }

  async function deleteAppointment(id: number) {
    if (!confirm("¿Seguro que querés borrar este turno?")) return;

    const res = await fetch(`/api/appointments?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data?.error || "Error borrando turno");
      return;
    }

    await loadAll();
  }

  async function updateAppointmentStatus(id: number, status: AppointmentStatus) {
    const res = await fetch(`/api/appointments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data?.error || "Error actualizando estado");
      return;
    }

    await loadAll();
  }

  const appointmentsByClient = useMemo(() => {
    const dni = searchDni.trim();
    if (!dni) return [];

    let list = appointments.filter((a) => a.client_dni === dni);

    if (statusFilter !== "Todos") {
      list = list.filter((a) => a.status === statusFilter);
    }

    list.sort((a, b) => {
      const aKey = `${a.date} ${a.time}`;
      const bKey = `${b.date} ${b.time}`;
      return aKey.localeCompare(bKey);
    });

    return list;
  }, [appointments, searchDni, statusFilter]);

  const totalTurnos = appointmentsByClient.length;
  const pendientes = appointmentsByClient.filter((a) => a.status === "Pendiente").length;

  async function copyWhatsApp() {
    if (!searchedClient?.phone) return;

    const phoneClean = searchedClient.phone.replace(/[^\d]/g, "");
    const text = `https://wa.me/${phoneClean}`;
    await navigator.clipboard.writeText(text);
    alert("Link de WhatsApp copiado ✅");
  }

  function newAppointmentForThisDni() {
    const dni = searchDni.trim();
    if (!dni) return;

    setClientId(dni);
    setDate(todayISO());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteOldAppointments() {
    const dni = searchDni.trim();
    if (!dni) return;

    const today = todayISO();
    const olds = appointments.filter(
      (a) => a.client_dni === dni && a.date < today
    );

    if (olds.length === 0) {
      alert("No hay turnos anteriores a hoy.");
      return;
    }

    const ok = confirm(
      `Vas a borrar ${olds.length} turno(s) anteriores a hoy (${today}). ¿Confirmás?`
    );

    if (!ok) return;

    for (const a of olds) {
      await fetch(`/api/appointments?id=${a.id}`, { method: "DELETE" });
    }

    await loadAll();
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header principal */}
        <header className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Turnero Pro</h1>
              <p className="text-gray-600 mt-1">
                Gestión de clientes y turnos – simple, rápido y profesional
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Actualizado: {new Date().toLocaleDateString("es-AR")}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center text-gray-500">
            Cargando datos...
          </div>
        ) : (
          <>
            {/* Añadir Cliente */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Nuevo Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="Teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="DNI"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="Email (opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                onClick={addClient}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-6 py-3 transition shadow-sm"
              >
                Guardar Cliente
              </button>
            </section>

            {/* Añadir Turno */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Nuevo Turno</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="DNI del cliente"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 cursor-not-allowed"
                  placeholder="Nombre"
                  value={selectedClient?.name || ""}
                  disabled
                />
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 cursor-not-allowed"
                  placeholder="Teléfono"
                  value={selectedClient?.phone || ""}
                  disabled
                />
                <input
                  type="date"
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <input
                  type="time"
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition md:col-span-2 lg:col-span-1"
                  placeholder="Servicio (ej: Corte + barba)"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition md:col-span-2 lg:col-span-3"
                  placeholder="Notas / observaciones (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <button
                onClick={addAppointment}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl px-6 py-3 transition shadow-sm"
              >
                Crear Turno
              </button>
            </section>

            {/* Historial por DNI */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Historial de Cliente</h2>
                  <p className="text-gray-600 text-sm mt-1">Buscá por DNI y gestioná sus turnos</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={newAppointmentForThisDni}
                    disabled={!searchDni.trim()}
                    className="bg-gray-900 hover:bg-black text-white rounded-xl px-5 py-2.5 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Nuevo turno para este DNI
                  </button>
                  <button
                    onClick={deleteOldAppointments}
                    disabled={!searchDni.trim()}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl px-5 py-2.5 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Borrar turnos anteriores
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="Ingrese DNI para buscar"
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                />
                <select
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "Todos" | AppointmentStatus)}
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Completado">Completado</option>
                </select>
                <button
                  onClick={copyWhatsApp}
                  disabled={!searchedClient?.phone}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl px-5 py-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copiar WhatsApp
                </button>
              </div>

              {searchDni.trim() && (
                <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
                  {searchedClient ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-gray-900">{searchedClient.name}</div>
                        <div className="text-gray-700 mt-1">
                          DNI <strong>{searchedClient.dni}</strong> • Tel <strong>{searchedClient.phone}</strong>
                          {searchedClient.email && <> • {searchedClient.email}</>}
                        </div>
                      </div>
                      <div className="flex gap-4 flex-wrap">
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm">
                          Total turnos: <strong className="text-gray-900">{totalTurnos}</strong>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm">
                          Pendientes: <strong className="text-amber-700">{pendientes}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-600 font-medium text-center py-4">
                      No se encontró cliente con ese DNI.
                    </div>
                  )}
                </div>
              )}

              {searchDni.trim() && (
                <div className="space-y-4">
                  {appointmentsByClient.length === 0 ? (
                    <div className="text-gray-500 text-center py-8 italic">
                      No hay turnos registrados para este cliente con el filtro actual.
                    </div>
                  ) : (
                    appointmentsByClient.map((a) => (
                      <div
                        key={a.id}
                        className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {a.date} • {a.time} — {a.service}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {a.notes || "Sin notas adicionales"}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <select
                            className={`rounded-xl px-4 py-2 text-sm font-medium border min-w-[140px] ${
                              a.status === "Pendiente" ? "bg-amber-50 text-amber-800 border-amber-200" :
                              a.status === "Confirmado" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                              a.status === "Cancelado" ? "bg-red-50 text-red-800 border-red-200" :
                              "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                            value={a.status}
                            onChange={(e) =>
                              updateAppointmentStatus(a.id, e.target.value as AppointmentStatus)
                            }
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Cancelado">Cancelado</option>
                            <option value="Completado">Completado</option>
                          </select>

                          <button
                            onClick={() => deleteAppointment(a.id)}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-medium transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Agenda Semanal / Mensual */}
            <WeeklyAgenda
              appointments={appointments}
              onDelete={deleteAppointment}
              onStatusChange={updateAppointmentStatus}
              onNewForDni={(dni) => {
                setClientId(dni);
                setDate(todayISO());
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Listado de Clientes */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Clientes Registrados</h2>

              {clients.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  Aún no hay clientes registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((c) => (
                    <div
                      key={c.dni}
                      className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-sm transition"
                    >
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        DNI {c.dni} • {c.phone}
                        {c.email && <> • {c.email}</>}
                      </div>
                      <button
                        onClick={() => deleteClient(c.dni)}
                        className="mt-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-medium transition"
                      >
                        Eliminar cliente
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}