"use client";

type Appointment = {
  id?: number
  date: string
  start_time: string
  end_time: string
  people: number
  clients?: {
    name?: string
  }
}

type Props = {
  appointments: Appointment[]
  date: string
}

export default function DayAgenda(props: Props){

  const { appointments, date } = props

  if(!appointments) return null

  const hours = [
    "18:00","18:30","19:00","19:30",
    "20:00","20:30","21:00","21:30",
    "22:00","22:30","23:00"
  ]

  // 🔥 CAMBIO CLAVE: ahora devuelve ARRAY
  function reservationsAtHour(time:string){

    return appointments.filter(a => {

      if(a.date !== date) return false

      return a.start_time.slice(0,5) === time

    })

  }

  return(

    <div className="bg-white rounded-xl shadow p-6">

      <h2 className="font-semibold mb-4">
        Agenda del día
      </h2>

      <div className="space-y-2">

        {hours.map(h=>{

          const reservations = reservationsAtHour(h)

          return(

            <div key={h} className="flex justify-between border-b pb-2">

              <div>{h}</div>

              <div className="text-right">

                {reservations.length > 0 ? (

                  <div className="space-y-1">

                    {reservations.map((r, i) => (
                      <div key={r.id || i}>
                        {r.clients?.name || "Reserva"} • {r.people} personas
                      </div>
                    ))}

                  </div>

                ) : "Libre"}

              </div>

            </div>

          )

        })}

      </div>

    </div>

  )

}