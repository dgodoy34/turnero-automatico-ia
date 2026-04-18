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

// 🔥 genera slots dinámicos
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

// 🔥 MATCH POR RANGO (CLAVE)
function isInSlot(time: string, start: string, interval: number) {
  const [h1, m1] = time.split(":").map(Number)
  const [h2, m2] = start.split(":").map(Number)

  const t1 = h1 * 60 + m1
  const t2 = h2 * 60 + m2

  return t2 >= t1 && t2 < t1 + interval
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  shift,
  interval = 30
}: Props) {

  if (!appointments || !schedules) return null

  const filteredSchedules = schedules.filter(s => {
    const hour = Number(s.start_time.slice(0, 2))
    return shift === "day" ? hour < 18 : hour >= 18
  })

  let hours: string[] = []

  filteredSchedules.forEach(s => {
    const slots = generateSlots(
      s.start_time.slice(0, 5),
      s.end_time.slice(0, 5),
      interval
    )
    hours = [...hours, ...slots]
  })

  // 🔥 FIXS IMPORTANTES
  hours = [...new Set(hours)]
  hours.sort()

  function peopleAtHour(time: string) {
    return appointments
      .filter(a =>
        a.date === date &&
        isInSlot(time, a.start_time.slice(0, 5), interval)
      )
      .reduce((sum, a) => sum + (a.people || 0), 0)
  }

  if (hours.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h2>No hay horarios configurados</h2>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">

      <h2 className="font-semibold mb-4">
        Ocupación por horario ({shift === "day" ? "Día" : "Noche"})
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