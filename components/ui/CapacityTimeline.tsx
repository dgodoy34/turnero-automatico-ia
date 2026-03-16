"use client"

type Appointment = {
  id: number
  date: string
  start_time: string
  end_time: string
  people: number
}

type Props = {
  appointments: Appointment[]
  date: string
}

export default function CapacityTimeline({ appointments, date }: Props) {

  if (!appointments) return null

  const hours = [
    "18:00","18:30","19:00","19:30",
    "20:00","20:30","21:00","21:30",
    "22:00","22:30","23:00"
  ]

  function peopleAtHour(time: string) {
    return appointments
      .filter(a => a.date === date && a.start_time.slice(0,5) === time)
      .reduce((sum, a) => sum + (a.people || 0), 0)
  }

  return (

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Ocupación por horario
</h2>

<div className="space-y-2">

{hours.map(h => {

const people = peopleAtHour(h)

let color = "bg-green-400"

if (people > 20) color = "bg-yellow-400"
if (people > 40) color = "bg-red-400"

return (

<div key={h} className="flex items-center gap-3">

<div className="w-16 text-sm">
{h}
</div>

<div className="flex-1 bg-gray-200 rounded h-4">

<div
className={`h-4 rounded ${color}`}
style={{ width: `${people * 2}%` }}
/>

</div>

<div className="text-xs w-10 text-right">
{people}
</div>

</div>

)

})}

</div>

</div>

  )
}