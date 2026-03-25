"use client";

import { useEffect, useState } from "react";

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

// 🔥 GENERADOR DE HORARIOS DINÁMICOS
function generateTimeSlots(open:string, close:string, interval:number){

  const times:string[] = []

  let [h,m] = open.split(":").map(Number)
  const [ch,cm] = close.split(":").map(Number)

  const start = new Date()
  start.setHours(h,m,0,0)

  const end = new Date()
  end.setHours(ch,cm,0,0)

  while(start <= end){
    const hh = String(start.getHours()).padStart(2,"0")
    const mm = String(start.getMinutes()).padStart(2,"0")
    times.push(`${hh}:${mm}`)

    start.setMinutes(start.getMinutes() + interval)
  }

  return times
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

    const slots = generateTimeSlots(open, close, interval)

    setHours(slots)
  }

  useEffect(()=>{
    loadTables()
    loadSettings()
  },[date])

  function reservationsAtHour(time:string){

    return appointments.filter(a=>{
      if(a.date !== date) return false
      return a.start_time.slice(0,5) === time
    })

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

if(reservation.status === "completed"){
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