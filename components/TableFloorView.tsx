"use client";

import { useEffect, useState } from "react";
import { generateTimeSlots } from "@/lib/generateTimeSlots";

type Appointment = {
  id: number
  date: string
  start_time: string
  end_time: string
  people: number
  assigned_table_capacity?: number
  tables_used?: number
  status: string
  clients?: {
    name?: string
  }
}

type TableType = {
  capacity: number
  quantity: number
}

type Settings = {
  open_time: string
  close_time: string
  slot_interval: number
}

type Props = {
  appointments?: Appointment[]
  date: string
}


export default function TableFloorView({appointments = [],date}:Props){

  const [tables,setTables] = useState<TableType[]>([])
  const [hours,setHours] = useState<string[]>([])

  async function loadTables(){

    const res = await fetch(`/api/table-inventory?date=${date}`)
    const data = await res.json()

    setTables(data.tables || [])
  }

  async function loadSettings(){

    const res = await fetch("/api/settings")
    const data = await res.json()

    const open = data?.settings?.open_time || "12:00"
    const close = data?.settings?.close_time || "23:30"
    const interval = data?.settings?.slot_interval || 30

    const slots = generateTimeSlots({
  open_time: open,
  close_time: close,
  slot_interval: interval
});

    setHours(slots)
  }

 useEffect(()=>{
  loadTables()
},[date])

useEffect(()=>{
  loadSettings()
},[])

  function reservationsAtHour(time: string) {

  const slot = new Date(`${date}T${time}:00`);

  return appointments.filter(a => {

    if (a.date !== date) return false;

    const start = new Date(`${date}T${a.start_time}`);
    const end = new Date(`${date}T${a.end_time}`);

    // 🔥 CLAVE: si el slot está dentro de la reserva
    return slot >= start && slot < end;
  });

}

  function isOccupied(time:string,reservation:Appointment){

    const slot = new Date(`${date}T${time}:00`)
    const start = new Date(`${date}T${reservation.start_time}`)
    const end = new Date(`${date}T${reservation.end_time}`)

    return slot > start && slot < end

  }

  return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Plano de mesas
</h2>

<div className="space-y-4">

{hours.map(h=>{

const reservations = reservationsAtHour(h)

const usedReservations:number[] = []

return(

<div key={h} className="border p-3 rounded">

<div className="font-semibold mb-2">
{h}
</div>

<div className="grid grid-cols-4 gap-2">

{tables.flatMap(t=>{

return Array.from({length:t.quantity}).map((_,i)=>{

let reservation = reservations.find((r,index)=>{

if(usedReservations.includes(index)) return false

if(!r.assigned_table_capacity) return false

return r.assigned_table_capacity === t.capacity

})

let color = "bg-green-200 border border-green-500"
let label = "🟢 Libre"

if(reservation){

const index = reservations.indexOf(reservation)
usedReservations.push(index)

if(reservation.status === "confirmed"){
  color = "bg-yellow-200 border border-yellow-500"
  label = "🟡 Reservada"
}
else if(reservation.status === "completed"){
  color = "bg-red-200 border border-red-500"
  label = "🔴 Ocupada"
}
}

else{

const activeReservations = appointments.filter(a=>{
if(a.date !== date) return false
if(a.assigned_table_capacity !== t.capacity) return false
return isOccupied(h,a)
})

if(i < activeReservations.length){
color = "bg-gray-300 border border-gray-500"
label = "⚫ En uso"
}

}

return(

<div
key={`${t.capacity}-${i}-${h}`}
className={`p-2 rounded text-sm ${color}`}
>

<div className="font-semibold">
Mesa {t.capacity === 6 ? "6+" : t.capacity}
</div>

<div className="text-xs text-gray-700">
{label}
</div>

{reservation?.clients?.name && (
<div className="text-xs mt-1">
{reservation.clients.name}
</div>
)}

</div>

)

})

})}

</div>

</div>

)

})}

</div>

</div>

)

}