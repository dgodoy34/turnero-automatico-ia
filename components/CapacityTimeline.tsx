"use client";

import { useEffect, useState } from "react";

type Appointment = {
  start_time: string;
  people: number;
};

export default function CapacityTimeline() {

  const [appointments,setAppointments] = useState<Appointment[]>([]);
  const [maxCapacity,setMaxCapacity] = useState(60);

  async function loadData(){

    const res = await fetch("/api/appointments");
    const data = await res.json();

    setAppointments(data.appointments || []);

    const r = await fetch("/api/restaurants");
    const rd = await r.json();

    if(rd.restaurant){
      setMaxCapacity(rd.restaurant.max_capacity || 60);
    }

  }

  useEffect(()=>{
    loadData();
  },[]);

  const hours = [
    "18:00","18:30","19:00","19:30",
    "20:00","20:30","21:00","21:30",
    "22:00"
  ];

  function peopleAt(time:string){

    return appointments
      .filter(a => a.start_time === time)
      .reduce((sum,a)=>sum + (a.people || 0),0);

  }

  function barWidth(p:number){
    return Math.min(100,(p/maxCapacity)*100);
  }

  return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Ocupación por hora
</h2>

<div className="space-y-3">

{hours.map(h=>{

const p = peopleAt(h);

return(

<div key={h} className="flex items-center gap-3">

<div className="w-16 text-sm">
{h}
</div>

<div className="flex-1 bg-gray-200 rounded h-4 overflow-hidden">

<div
className="bg-indigo-500 h-4"
style={{ width: `${barWidth(p)}%` }}
/>

</div>

<div className="w-16 text-sm text-right">
{p}/{maxCapacity}
</div>

</div>

);

})}

</div>

</div>

  );
}