"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  assigned_table_capacity: number;
  clients?: {
    name?: string;
  };
};

type TableType = {
  capacity: number;
  quantity: number;
};

export default function TableFloorView() {

  const [appointments,setAppointments] = useState<Appointment[]>([]);
  const [tables,setTables] = useState<TableType[]>([]);
  const [date,setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function loadData(){

    const apptRes = await fetch("/api/appointments");
    const apptData = await apptRes.json();

    const tableRes = await fetch("/api/table-inventory");
    const tableData = await tableRes.json();

    setAppointments(apptData.appointments || []);
    setTables(tableData.tables || []);
  }

  useEffect(()=>{
    loadData();
  },[]);

  const hours = [
    "18:00","18:30","19:00","19:30",
    "20:00","20:30","21:00","21:30",
    "22:00"
  ];

  function findReservation(time:string,capacity:number){

  return appointments.find(a => {

    const apptDate = a.date?.slice(0,10)

    if(apptDate !== date) return false
    if(a.assigned_table_capacity !== capacity) return false

    const slot = new Date(`${date}T${time}:00`).getTime()
    const start = new Date(`${apptDate}T${a.start_time}`).getTime()
    const end = new Date(`${apptDate}T${a.end_time}`).getTime()

    return slot >= start && slot < end

  })

}
  return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Mesas por horario
</h2>

<input
type="date"
value={date}
onChange={(e)=>setDate(e.target.value)}
className="border p-2 rounded mb-4"
/>

<div className="space-y-4">

{hours.map(h=>(

<div key={h} className="border p-3 rounded">

<div className="font-semibold mb-2">
{h}
</div>

<div className="grid grid-cols-4 gap-2">

{tables.flatMap(t =>
  Array.from({length:t.quantity}).map((_,i)=>{

    const reservation = findReservation(h,t.capacity);

    let color = "bg-green-100";
    let label = "Libre";

    if(reservation){
      color = "bg-yellow-100";
      label = reservation.clients?.name || "Reservada";
    }

    return(

<div
key={`${t.capacity}-${i}`}
className={`p-2 rounded text-sm ${color}`}
>

<div className="font-semibold">
Mesa {t.capacity}
</div>

<div className="text-xs text-gray-600">
{label}
</div>

</div>

);

})
)}

</div>

</div>

))}

</div>

</div>

  );
}