"use client";

import { useMemo } from "react";
import type { Appointment } from "@/types/Appointment";

interface Props{
appointments:Appointment[];
date:string;
}

const hours=[
"18:00","18:30","19:00","19:30",
"20:00","20:30","21:00","21:30",
"22:00"
];

export default function DayAgenda({appointments,date}:Props){

const dayAppointments=useMemo(()=>{

return appointments
.filter(a=>a.date===date)
.sort((a,b)=>a.time.localeCompare(b.time))

},[appointments,date]);

function findReservation(time:string){

return dayAppointments.find(a=>a.time===time);

}

return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Agenda del día
</h2>

<div className="space-y-2">

{hours.map(h=>{

const r=findReservation(h);

return(

<div
key={h}
className="flex justify-between border-b py-2"
>

<div className="font-medium w-20">
{h}
</div>

{r? (

<div className="flex gap-3">

<div>
Mesa {r.assigned_table_capacity}
</div>

<div>
{r.clients?.name}
</div>

<div className="text-gray-500">
{r.people} personas
</div>

</div>

):(

<div className="text-gray-400">
Libre
</div>

)}

</div>

);

})}

</div>

</div>

);
}