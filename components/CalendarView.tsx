"use client";

import { useMemo,useState } from "react";
import type { Appointment } from "@/types/Appointment";

type Mode = "day"|"week"|"month";

interface Props{
appointments:Appointment[];
onCheckIn:(id:number)=>void;
onNoShow:(id:number)=>void;
onDelete:(id:number)=>void;
}

function formatISO(date:Date){
return date.toISOString().split("T")[0];
}

function startOfWeek(date:Date){
const d=new Date(date);
const day=d.getDay();
const diff=d.getDate()-day+(day===0?-6:1);
return new Date(d.setDate(diff));
}

const days=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

export default function CalendarView({
appointments,
onCheckIn,
onNoShow,
onDelete
}:Props){

const [mode,setMode]=useState<Mode>("month");
const [currentDate,setCurrentDate]=useState(new Date());
const [selected,setSelected]=useState<Appointment|null>(null);

const weekStart=useMemo(()=>startOfWeek(currentDate),[currentDate]);

const monthTitle=currentDate.toLocaleDateString("es-AR",{
month:"long",
year:"numeric",
timeZone:"UTC"
});

const goNext=()=>{
const d=new Date(currentDate);
if(mode==="day") d.setDate(d.getDate()+1);
if(mode==="week") d.setDate(d.getDate()+7);
if(mode==="month") d.setMonth(d.getMonth()+1);
setCurrentDate(d);
};

const goPrev=()=>{
const d=new Date(currentDate);
if(mode==="day") d.setDate(d.getDate()-1);
if(mode==="week") d.setDate(d.getDate()-7);
if(mode==="month") d.setMonth(d.getMonth()-1);
setCurrentDate(d);
};

return(

<div className="space-y-6">

{/* HEADER */}

<div className="flex justify-between items-center">

<h2 className="text-xl font-semibold capitalize text-indigo-600">
{monthTitle}
</h2>

<div className="flex gap-2">

{(["day","week","month"] as Mode[]).map(m=>(

<button
key={m}
onClick={()=>setMode(m)}
className={`px-3 py-1 rounded ${
mode===m?"bg-indigo-600 text-white":"bg-gray-200"
}`}
>
{m}
</button>

))}

<button onClick={goPrev} className="px-2">←</button>

<button
onClick={()=>setCurrentDate(new Date())}
className="px-3 py-1 bg-gray-200 rounded"
>
Hoy
</button>

<button onClick={goNext} className="px-2">→</button>

</div>

</div>

{/* DAY VIEW */}

{mode==="day" && (

<div className="border rounded p-4">

<div className="font-semibold mb-4">
{currentDate.toLocaleDateString()}
</div>

<div className="space-y-2">

{appointments
.filter(a=>a.date===formatISO(currentDate))
.map(a=>(

<div
key={a.id}
onClick={()=>setSelected(a)}
className="p-2 bg-indigo-100 rounded cursor-pointer"
>

{a.time} • {a.people}

</div>

))}

</div>

</div>

)}

{/* WEEK VIEW */}

{mode==="week" && (

<div className="grid grid-cols-7 gap-2">

{Array.from({length:7}).map((_,i)=>{

const day=new Date(weekStart);
day.setDate(day.getDate()+i);

const iso=formatISO(day);

const dayAppointments=appointments.filter(a=>a.date===iso);

return(

<div key={i} className="border rounded p-2 min-h-[120px]">

<div className="text-xs font-semibold mb-2">
{days[i]} {day.getDate()}
</div>

{dayAppointments.map(a=>(

<div
key={a.id}
onClick={()=>setSelected(a)}
className="text-xs bg-indigo-100 mb-1 px-1 rounded cursor-pointer"
>
{a.time} • {a.people}
</div>

))}

</div>

);

})}

</div>

)}

{/* MONTH VIEW */}

{mode==="month"&&(

<div className="grid grid-cols-7 gap-2">

{Array.from({length:42}).map((_,i)=>{

const firstDay=new Date(currentDate.getFullYear(),currentDate.getMonth(),1);
const startDay=firstDay.getDay()||7;

const cellDate=new Date(firstDay);
cellDate.setDate(i-(startDay-1)+1);

const iso=formatISO(cellDate);

const dayAppointments=appointments.filter(a=>a.date===iso);

return(

<div key={i} className="border rounded p-2 h-32 overflow-y-auto">

<div className="text-xs font-semibold mb-1">
{cellDate.getDate()}
</div>

{dayAppointments.map(a=>(

<div
key={a.id}
onClick={()=>setSelected(a)}
className="text-xs bg-indigo-100 mb-1 px-1 rounded cursor-pointer"
>
{a.time} • {a.people}
</div>

))}

</div>

);

})}

</div>

)}

{/* MODAL */}

{selected && (

<div
className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
onClick={()=>setSelected(null)}
>

<div
className="bg-white p-6 rounded-xl w-[420px] space-y-4"
onClick={(e)=>e.stopPropagation()}
>

<h3 className="text-lg font-semibold">
Reserva #{selected.reservation_code}
</h3>

<div className="space-y-1">

<div><b>Fecha:</b> {selected.date}</div>
<div><b>Hora:</b> {selected.time}</div>
<div><b>Personas:</b> {selected.people}</div>

{selected.assigned_table_capacity && (
<div><b>Mesa:</b> {selected.assigned_table_capacity}</div>
)}

{selected.clients?.name && (
<div><b>Cliente:</b> {selected.clients.name}</div>
)}

</div>

<div className="flex gap-2 pt-4">

<button
onClick={()=>onCheckIn(selected.id)}
className="flex-1 bg-green-600 text-white py-2 rounded"
>
Check-in
</button>

<button
onClick={()=>onNoShow(selected.id)}
className="flex-1 bg-orange-500 text-white py-2 rounded"
>
No-show
</button>

<button
onClick={()=>onDelete(selected.id)}
className="flex-1 bg-red-600 text-white py-2 rounded"
>
Eliminar
</button>

</div>

<button
onClick={()=>setSelected(null)}
className="bg-indigo-600 text-white px-4 py-2 rounded w-full"
>
Cerrar
</button>

</div>

</div>

)}

</div>

);

}