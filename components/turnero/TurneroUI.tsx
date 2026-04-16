"use client";

import { useEffect, useMemo, useState } from "react";
import CalendarView from "../../components/CalendarView";
import CapacityTimeline from "@/components/ui/CapacityTimeline";
import DayAgenda from "@/components/ui/DayAgenda";
import type { Appointment, AppointmentStatus } from "@/types/Appointment";
import { getDateISOInTimezone } from "@/lib/time";
import RestaurantClock from "@/components/RestaurantClock";
import { useRestaurant } from "@/lib/useRestaurant";

function statusColor(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "no_show":
      return "bg-orange-100 text-orange-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
  }
}

export default function TurneroUI() {

  const [appointments,setAppointments] = useState<Appointment[]>([]);
  const [loading,setLoading] = useState(true);

  const [searchCode,setSearchCode] = useState("");

  const [clientId,setClientId] = useState("");
  const [date,setDate] = useState("");
  const [time,setTime] = useState("");
  const [people,setPeople] = useState(2);
  const [notes,setNotes] = useState("");

  const [selectedDate,setSelectedDate] = useState("");
  const [source, setSource] = useState("manual");
  const [selectedSource, setSelectedSource] = useState("manual");

  const [settings, setSettings] = useState<any>(null);
 
const restaurantId = useRestaurant();

  
  async function loadAll(){

    setLoading(true);

    const res = await fetch("/api/appointments", {
  headers: {
    "x-restaurant-id": restaurantId!
  }
})
    const data = await res.json();

    setAppointments(data.appointments || []);
    setLoading(false);

  }

  useEffect(() => {
  if (restaurantId) {
    loadAll();
  }
}, [restaurantId]);

  useEffect(() => {
  if (settings?.timezone) {
    const today = getDateISOInTimezone(settings.timezone);
    setDate(today);
    setSelectedDate(today);
  }
}, [settings]);



const timezone = settings?.timezone || "America/Argentina/Buenos_Aires";

async function addAppointment(){

  const res = await fetch("/api/appointments", {
    headers: {
      "x-restaurant-id": restaurantId!,
      "Content-Type":"application/json"
    },
    method:"POST",
   body: JSON.stringify({
  client_dni: clientId,
  date,
  time,
  people: Number(people), // 🔥 importante
  notes,
  source: selectedSource || "manual" // 🔥 clave
})
  });

    if(!res.ok){
      alert("Error creando reserva");
      return;
    }

    setClientId("");
    setTime("");
    setPeople(2);
    setNotes("");

    await loadAll();

  }

  async function updateAppointmentStatus(id:number,status:AppointmentStatus){

    await fetch("/api/appointments", {
  headers: {
    "x-restaurant-id": restaurantId!,
    "Content-Type":"application/json"
  },
  method:"PUT",
  body:JSON.stringify({ id,status })
});

    await loadAll();

  }

  async function deleteAppointment(id:number){

    if(!confirm("Eliminar reserva?")) return;

    await fetch(`/api/appointments?id=${id}`, {
  method: "DELETE",
  headers: {
    "x-restaurant-id": restaurantId!
  }
});
  

    await loadAll();

  }

  const todayReservations = useMemo(
 ()=>appointments.filter(a=>a.date===selectedDate),
 [appointments,selectedDate]
);


  const occupancy = todayReservations.reduce(
 (acc,r)=>acc+r.people,
 0
);

  const foundReservations = useMemo(() => {

  const value = searchCode.trim().toLowerCase();
  if (!value) return [];

  return appointments.filter(a =>

    // 🔥 FILTRO POR FECHA (LA CLAVE)
    a.date === selectedDate && (

      a.reservation_code?.toLowerCase() === value ||
      a.client_dni === value ||
      a.clients?.name?.toLowerCase().includes(value)

    )

  );

}, [appointments, searchCode, selectedDate]);

  const upcoming = useMemo(()=>{

    const today = getDateISOInTimezone(timezone);

    return appointments
      .filter(a=>a.date >= today)
      .sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0,10);

  },[appointments]);

  return (

<div className="min-h-screen bg-gray-50 text-gray-900 p-8 space-y-10">


{/* HEADER */}

<div className="flex justify-end text-sm text-gray-600">
  <RestaurantClock timezone={timezone} />
</div>

<div className="flex justify-between items-center">

<div>
<h1 className="text-3xl font-bold text-indigo-600">
Turnero AI
</h1>

<p className="text-sm text-gray-500">
Gestión inteligente de reservas
</p>
</div>

<div className="text-gray-500">
{selectedDate}
</div>

</div>

{/* SELECTOR DE FECHA */}

<div className="bg-white rounded-xl shadow p-6">

<div className="flex items-center gap-4">

<label className="font-semibold">
Servicio del día
</label>

<input
type="date"
value={selectedDate}
onChange={(e)=>setSelectedDate(e.target.value)}
className="border p-2 rounded"
/>

<button
onClick={loadAll}
className="bg-indigo-600 text-white px-4 py-2 rounded"
>
Buscar
</button>

</div>

</div>

{/* KPIs */}

<div className="grid grid-cols-4 gap-6">

<div className="bg-white rounded-xl shadow p-6">
<div className="text-gray-500 text-sm">Reservas hoy</div>
<div className="text-3xl font-bold">{todayReservations.length}</div>
</div>

<div className="bg-white rounded-xl shadow p-6">
<div className="text-gray-500 text-sm">Personas hoy</div>
<div className="text-3xl font-bold">{occupancy}</div>
</div>

<div className="bg-white rounded-xl shadow p-6">
<div className="text-gray-500 text-sm">Mesas usadas</div>
<div className="text-3xl font-bold">
{todayReservations.filter(r => r.assigned_table_capacity).length}
</div>
</div>

<div className="bg-white rounded-xl shadow p-6">
<div className="text-gray-500 text-sm">Promedio por reserva</div>
<div className="text-3xl font-bold">
{todayReservations.length
? Math.round(occupancy / todayReservations.length)
: 0}
</div>
</div>

</div>

{/* BUSCAR RESERVA */}

<div className="bg-white rounded-xl shadow p-6 space-y-4">

<h2 className="text-lg font-semibold">
Buscar reserva
</h2>

<input
placeholder="Buscar por DNI, nombre o código"
value={searchCode}
onChange={(e)=>setSearchCode(e.target.value)}
className="border p-3 rounded w-full"
/>
{foundReservations.length > 0 && (
  <div className="space-y-4">
    {foundReservations.map(r => (

      <div key={r.id} className="border rounded p-4 space-y-2">

        <div className="flex justify-between">
          <div>
            {r.date} • {r.time}
          </div>

          <span className={`px-2 py-1 text-xs rounded ${statusColor(r.status)}`}>
            {r.status}
          </span>
        </div>

        <div>
          {r.people} personas
        </div>

        <div>
          Cliente: {r.clients?.name}
        </div>

        <div className="text-xs text-gray-500">
  {r.source === "walkin" && "🚶 Walk-in"}
  {r.source === "phone" && "📞 Telefónica"}
  {r.source === "manual" && "🧾 Manual"}
  {r.source === "online" && "🌐 Online"}
</div>

        <div className="flex gap-3 pt-3">

          <button
            onClick={()=>updateAppointmentStatus(r.id,"completed")}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Check-in
          </button>

          <button
            onClick={()=>updateAppointmentStatus(r.id,"no_show")}
            className="px-3 py-1 bg-orange-500 text-white rounded"
          >
            No-show
          </button>

          <button
            onClick={()=>deleteAppointment(r.id)}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Eliminar
          </button>

        </div>

      </div>

    ))}
  </div>
)}

{/* AGENDA + CREAR RESERVA */}

<div className="grid grid-cols-2 gap-6">

<DayAgenda appointments={appointments} date={selectedDate} />



{/* NUEVA RESERVA */}

<div className="bg-white rounded-xl shadow p-6 space-y-4">

<h2 className="font-semibold">
Nueva reserva
</h2>

<div className="grid grid-cols-2 gap-3">

  <select
  value={selectedSource}
  onChange={(e) => setSelectedSource(e.target.value)}
  className="border p-3 rounded w-full"
>
  <option value="manual">📋 Manual</option>
  <option value="walkin">🚶 Walk-in</option>
  <option value="phone">📞 Telefónica</option>
  <option value="online">🌐 Online</option>
</select>

<input
placeholder="DNI"
value={clientId}
onChange={(e)=>setClientId(e.target.value)}
className="border p-3 rounded"
/>

<input
type="number"
value={people}
onChange={(e)=>setPeople(Number(e.target.value))}
className="border p-3 rounded"
/>

<input
type="date"
value={date}
onChange={(e)=>setDate(e.target.value)}
className="border p-3 rounded"
/>

<input
type="time"
value={time}
onChange={(e)=>setTime(e.target.value)}
className="border p-3 rounded"
/>

</div>

<textarea
placeholder="Notas"
value={notes}
onChange={(e)=>setNotes(e.target.value)}
className="border p-3 rounded w-full"
/>

<button
onClick={addAppointment}
className="bg-indigo-600 text-white px-6 py-3 rounded w-full"
>
Crear reserva
</button>

</div>

</div>

{/* RESERVAS DEL DÍA */}

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Reservas del día
</h2>

<div className="overflow-x-auto">

<table className="w-full text-sm">

<thead className="text-gray-500 border-b">

<tr>

<th className="text-left py-2">Hora</th>
<th className="text-left py-2">Cliente</th>
<th className="text-left py-2">Personas</th>
<th className="text-left py-2">Mesa</th>
<th className="text-left py-2">Estado</th>

</tr>

</thead>

<tbody>

{todayReservations
.sort((a,b)=>a.time.localeCompare(b.time))
.map(r=>(

<tr key={r.id} className="border-b hover:bg-gray-50">

<td className="py-2">
{r.time}
</td>

<td>
{r.clients?.name || "Cliente"}
</td>

<td>
{r.people}
</td>

<td>
{r.assigned_table_capacity || "-"}
</td>

<td>

<span className={`px-2 py-1 rounded text-xs ${statusColor(r.status)}`}>
{r.status}
</span>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>


{/* OCUPACIÓN */}

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Ocupación por horario
</h2>

<CapacityTimeline
appointments={appointments}
date={selectedDate}
/>

</div>



{/* CALENDARIO */}

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Calendario de reservas
</h2>

{!loading && (

<CalendarView
appointments={appointments}
onCheckIn={(id)=>updateAppointmentStatus(id,"completed")}
onNoShow={(id)=>updateAppointmentStatus(id,"no_show")}
onDelete={deleteAppointment}
/>

)}

</div>



{/* PRÓXIMAS RESERVAS */}

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Próximas reservas
</h2>

<div className="space-y-2">

{upcoming.map(a=>(

<div key={a.id} className="flex justify-between border-b pb-2">

<div>
{a.date} • {a.time} • {a.people}
</div>

<span className={`px-2 py-1 text-xs rounded ${statusColor(a.status)}`}>
{a.status}
</span>

</div>

))}

</div>

</div>

</div>
</div>
)}