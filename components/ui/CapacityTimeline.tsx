"use client";

type Appointment = {
  id: number;
  date: string;
  start_time: string;
  people: number;
};

type Schedule = {
  start_time: string;
  end_time: string;
};

type Table = {
  capacity: number;
  quantity: number;
};

type Props = {
  appointments: Appointment[];
  date: string;
  schedules: Schedule[];
  tables: Table[]; // 👈 IMPORTANTE
  interval?: number;
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  while (h < endH || (h === endH && m <= endM)) {
    slots.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );

    m += interval;
    if (m >= 60) {
      h++;
      m -= 60;
    }
  }

  return slots;
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  tables,
  interval = 30,
}: Props) {
  if (!schedules?.length) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        No hay horarios configurados
      </div>
    );
  }

  // 🔥 generar horas desde schedule
  let hours: string[] = [];

  schedules.forEach((s) => {
    const slots = generateSlots(
      s.start_time.slice(0, 5),
      s.end_time.slice(0, 5),
      interval
    );
    hours = [...hours, ...slots];
  });

  hours = [...new Set(hours)].sort();

  // 🔥 capacidad real desde inventory
  const maxCapacity = tables.reduce(
    (acc, t) => acc + t.capacity * t.quantity,
    0
  );

  function peopleAtHour(time: string) {
    return appointments
      .filter(
        (a) =>
          a.date === date && a.start_time.slice(0, 5) === time
      )
      .reduce((sum, a) => sum + (a.people || 0), 0);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-4">
        Ocupación por horario
      </h2>

      <div className="space-y-2">
        {hours.map((h) => {
          const people = peopleAtHour(h);
          const percent = maxCapacity
            ? (people / maxCapacity) * 100
            : 0;

          let color = "bg-green-400";
          if (percent > 50) color = "bg-yellow-400";
          if (percent > 80) color = "bg-red-500";

          return (
            <div key={h} className="flex items-center gap-3">
              <div className="w-16 text-sm">{h}</div>

              <div className="flex-1 bg-gray-200 rounded h-4">
                <div
                  className={`h-4 rounded ${color}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="text-xs w-12 text-right">
                {people} / {maxCapacity}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}