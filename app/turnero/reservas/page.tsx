"use client";

import { useEffect, useMemo, useState } from "react";
import type { Appointment, AppointmentStatus } from "@/types/Appointment";

function todayISO(){
return new Date().toISOString().split("T")[0];
}

export default function Reservas(){

const [appointments,setAppointments] = useState<Appointment[]>([]);
const [loading,setLoading] = useState(true);
const [date,setDate] = useState(todayISO());

async function load(){

const res = await fetch("/api/appointments");
const data = await res.json();

setAppointments(data.appointments || []);
setLoading(false);

}

useEffect(()=>{
load();
},[]);

async function updateStatus(id:number,status:AppointmentStatus){

await fetch("/api/appointments",{
method:"PUT",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ id,status })
});

load();

}

async function deleteReservation(id:number){

if(!confirm("Eliminar reserva?")) return;

await fetch(`/api/appointments?id=${id}`,{
method:"DELETE"
});

load();

}

const filtered = useMemo(()=>{

return appointments
.filter(a => !date || a.date === date)
.sort((a,b)=>{

const d = a.date.localeCompare(b.date);
if(d !== 0) return d;

return a.time.localeCompare(b.time);

});

},[appointments,date]);

return(

<div className="space-y-6">

<h1 className="text-2xl font-bold">
Reservas
</h1>

{/* FILTRO */}

<div className="bg-white rounded-xl shadow p-4 flex gap-4 items-center">

<label className="text-sm font-semibold">
Filtrar por fecha
</label>

<input
type="date"
value={date}
onChange={(e)=>setDate(e.target.value)}
className="border rounded p-2"
/>

<button
onClick={()=>setDate("")}
className="px-3 py-2 bg-gray-200 rounded text-sm"
>
Ver todas
</button>

</div>

{/* TABLA */}

<div className="bg-white rounded-xl shadow overflow-hidden">

<table className="w-full">

<thead className="border-b bg-gray-50">

<tr className="text-left text-sm text-gray-600">

<th className="p-3">Fecha</th>
<th className="p-3">Hora</th>
<th className="p-3">Personas</th>
<th className="p-3">Cliente</th>
<th className="p-3">Estado</th>
<th className="p-3">Acciones</th>

</tr>

</thead>

<tbody>

{loading && (

<tr>
<td className="p-4">Cargando...</td>
</tr>

)}

{filtered.map(a => (

<tr key={a.id} className="border-b hover:bg-gray-50">

<td className="p-3">
{a.date}
</td>

<td className="p-3 font-semibold">
{a.time}
</td>

<td className="p-3">
{a.people}
</td>

<td className="p-3">
{a.clients?.name || "-"}
</td>

<td className="p-3">
{a.status}
</td>

<td className="p-3 flex gap-2">

<button
onClick={()=>updateStatus(a.id,"completed")}
className="text-xs px-2 py-1 bg-green-600 text-white rounded"
>
Check-in
</button>

<button
onClick={()=>updateStatus(a.id,"no_show")}
className="text-xs px-2 py-1 bg-orange-500 text-white rounded"
>
No-show
</button>

<button
onClick={()=>updateStatus(a.id,"cancelled")}
className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
>
Cancelar
</button>

<button
onClick={()=>deleteReservation(a.id)}
className="text-xs px-2 py-1 bg-red-600 text-white rounded"
>
Eliminar
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

)

}


