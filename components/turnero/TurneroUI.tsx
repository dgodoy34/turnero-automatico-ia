"use client";

import { useEffect, useMemo, useState } from "react";
import CalendarView from "../../components/CalendarView";
import TableInventoryView from "@/components/TableInventoryView";
import type { Appointment, AppointmentStatus } from "@/types/Appointment";
import DailyTableSetup from "@/components/DailyTableSetup";
import TableFloorView from "@/components/TableFloorView";
import CapacityTimeline from "@/components/CapacityTimeline";
import DayAgenda from "@/components/DayAgenda";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

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
  const [date,setDate] = useState(todayISO());
  const [time,setTime] = useState("");
  const [people,setPeople] = useState(2);
  const [notes,setNotes] = useState("");

  async function loadAll(){

    setLoading(true);

    const res = await fetch("/api/appointments");

    if (!res.ok) {
      console.error("API error", res.status);
      return;
    }

    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoading(false);
  }

  useEffect(()=>{
    loadAll();
  },[]);

  async function addAppointment(){

    const res = await fetch("/api/appointments",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        client_dni:clientId,
        date,
        time,
        people,
        notes
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

    await fetch("/api/appointments",{
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ id,status })
    });

    await loadAll();
  }

  async function deleteAppointment(id:number){

    if(!confirm("Eliminar reserva?")) return;

    await fetch(`/api/appointments?id=${id}`,{
      method:"DELETE"
    });

    await loadAll();
  }

  const todayReservations = useMemo(
    ()=>appointments.filter(a=>a.date===todayISO()),
    [appointments]
  );

  const occupancy = todayReservations.reduce(
    (acc,r)=>acc+r.people,
    0
  );

  const foundReservation = useMemo(()=>{

    const value = searchCode.trim().toLowerCase();
    if(!value) return null;

    return appointments.find(a =>
      a.reservation_code?.toLowerCase() === value ||
      a.client_dni === value ||
      a.clients?.name?.toLowerCase().includes(value)
    ) || null;

  },[appointments,searchCode]);

  const upcoming = useMemo(()=>{

    const today = todayISO();

    return appointments
      .filter(a=>a.date >= today)
      .sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0,10);

  },[appointments]);

  return (

<div className="min-h-screen bg-gray-50 text-gray-900 p-8 space-y-10">

{/* HEADER */}

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
{todayISO()}
</div>

</div>

{/* ESTADÍSTICAS DEL DÍA */}

<div className="grid grid-cols-3 gap-6">

  <div className="bg-white rounded-xl shadow p-6">
    <div className="text-gray-500 text-sm">Reservas hoy</div>
    <div className="text-3xl font-bold">
      {todayReservations.length}
    </div>
  </div>

  <div className="bg-white rounded-xl shadow p-6">
    <div className="text-gray-500 text-sm">Personas hoy</div>
    <div className="text-3xl font-bold">
      {occupancy}
    </div>
  </div>

  <div className="bg-white rounded-xl shadow p-6">
    <div className="text-gray-500 text-sm">Confirmadas</div>
    <div className="text-3xl font-bold">
      {todayReservations.filter(r => r.status === "confirmed").length}
    </div>
  </div>

</div>



{/* BUSCAR RESERVA */}

<div className="bg-white rounded-xl shadow p-6 space-y-4">

<h2 className="text-lg font-semibold">
Buscar reserva
</h2>

<input
placeholder="Buscar por DNI, nombre o código de reserva"
value={searchCode}
onChange={(e)=>setSearchCode(e.target.value)}
className="border p-3 rounded w-full"
/>

{foundReservation && (

<div className="border rounded p-4 space-y-2">

<div className="flex justify-between">

<div className="font-semibold space-y-1">

<div className="text-xs text-gray-500">
Código: {foundReservation.reservation_code}
</div>

<div>
{foundReservation.date} • {foundReservation.time}
</div>

</div>

<span className={`px-2 py-1 text-xs rounded ${statusColor(foundReservation.status)}`}>
{foundReservation.status}
</span>

</div>

<div>{foundReservation.people} personas</div>

<div>Cliente: {foundReservation.clients?.name}</div>

{foundReservation.assigned_table_capacity && (
<div>Mesa asignada: {foundReservation.assigned_table_capacity}</div>
)}

{foundReservation.notes && (
<div className="text-sm text-gray-500">
{foundReservation.notes}
</div>
)}

<div className="flex gap-3 pt-3">

<button
onClick={()=>updateAppointmentStatus(foundReservation.id,"completed")}
className="px-3 py-1 bg-green-600 text-white rounded"
>
Check-in
</button>

<button
onClick={()=>updateAppointmentStatus(foundReservation.id,"no_show")}
className="px-3 py-1 bg-orange-500 text-white rounded"
>
No-show
</button>

<button
onClick={()=>deleteAppointment(foundReservation.id)}
className="px-3 py-1 bg-red-600 text-white rounded"
>
Eliminar
</button>

</div>

</div>

)}

</div>


{/* NUEVA RESERVA */}

<div className="bg-white rounded-xl shadow p-6 space-y-4">

<h2 className="font-semibold">
Nueva reserva
</h2>

<div className="grid grid-cols-4 gap-3">

<input
placeholder="DNI"
value={clientId}
onChange={(e)=>setClientId(e.target.value)}
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

<input
type="number"
value={people}
onChange={(e)=>setPeople(Number(e.target.value))}
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
className="bg-indigo-600 text-white px-6 py-3 rounded"
>
Crear reserva
</button>

</div>


{/* CALENDARIO */}

<div className="bg-white rounded-xl shadow p-6">

{!loading && (
<CalendarView
appointments={appointments}
onCheckIn={(id)=>updateAppointmentStatus(id,"completed")}
onNoShow={(id)=>updateAppointmentStatus(id,"no_show")}
onDelete={deleteAppointment}
/>
)}

</div>

<DayAgenda
appointments={appointments}
date={todayISO()}
/>

{/* OCUPACIÓN */}

<CapacityTimeline />


{/* MESAS */}

<TableInventoryView />

<TableFloorView />


{/* CONFIGURACIÓN */}

<DailyTableSetup />


{/* PROXIMAS RESERVAS */}

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Próximas reservas
</h2>

<div className="space-y-2 max-h-64 overflow-y-auto">

{upcoming.map(a=>(

<div key={a.id} className="border-b pb-2">

<div className="flex justify-between">

<div>
{a.date} • {a.time} • {a.people}
</div>

<span className={`px-2 py-1 text-xs rounded ${statusColor(a.status)}`}>
{a.status}
</span>

</div>

</div>

))}

</div>

</div>

</div>

  );
}