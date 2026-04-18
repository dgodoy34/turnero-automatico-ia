"use client";

type Appointment = {
  id: number
  date: string
  start_time: string
  end_time: string
  people: number
}

type Schedule = {
  start_time: string
  end_time: string
}

type Props = {
  appointments: Appointment[]
  date: string
  schedules: Schedule[]
  shift: "day" | "night"
  interval?: number
}

// 🔥 genera slots dinámicos (igual que DayAgenda)
function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = []

  let [h, m] = start.split(":").map(Number)
  const [endH, endM] = end.split(":").map(Number)

  while (h < endH || (h === endH && m <= endM)) {
    const hh = String(h).padStart(2, "0")
    const mm = String(m).padStart(2, "0")
    slots.push(`${hh}:${mm}`)

    m += interval
    if (m >= 60) {
      h++
      m -= 60
    }
  }

  return slots
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  shift,
  interval = 30
}: Props) {

  if (!appointments || !schedules) return null

  // 🔥 filtramos turnos según día / noche
  const filteredSchedules = schedules.filter(s => {
    const hour = Number(s.start_time.slice(0, 2))
    return shift === "day" ? hour < 18 : hour >= 18
  })

  // 🔥 generamos horarios reales
  let hours: string[] = []

  filteredSchedules.forEach(s => {
    const slots = generateSlots(
      s.start_time.slice(0, 5),
      s.end_time.slice(0, 5),
      interval
    )
    hours = [...hours, ...slots]
  })

  // 🔥 eliminar duplicados (por si hay varios turnos)
  hours = [...new Set(hours)]

  // 🔥 ordenar horarios
  hours.sort()

  // 🔥 calcular personas por horario
  function peopleAtHour(time: string) {
    return appointments
      .filter(a => a.date === date && a.start_time.slice(0, 5) === time)
      .reduce((sum, a) => sum + (a.people || 0), 0)
  }

  return (

    <div className="bg-white rounded-xl shadow p-6">

      <h2 className="font-semibold mb-4">
        Ocupación por horario ({shift === "day" ? "Día" : "Noche"})
      </h2>

      <div className="space-y-2">

        {hours.map(h => {

          const people = peopleAtHour(h)

          // 🔥 colores dinámicos (simple por ahora)
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
                  style={{ width: `${Math.min(people * 2, 100)}%` }}
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