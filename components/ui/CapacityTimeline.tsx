"use client";

type Appointment = {
  id: number;
  date: string;
  start_time?: string;
  time?: string;
  people: number;
};

type Schedule = {
  start_time?: string;
  end_time?: string;
};

type Table = {
  capacity: number;
  quantity: number;
};

type Props = {
  appointments: Appointment[];
  date: string;
  schedules: Schedule[];
  tables: Table[];
  interval?: number;
  shift?: "day" | "night"; // 👈 agregamos shift
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  let [endH, endM] = end.split(":").map(Number);

  let startMinutes = h * 60 + m;
  let endMinutes = endH * 60 + endM;

  // 🔥 SI TERMINA AL DÍA SIGUIENTE
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  for (let t = startMinutes; t <= endMinutes; t += interval) {
    const hh = Math.floor((t % (24 * 60)) / 60);
    const mm = t % 60;

    slots.push(
      `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
    );
  }

  return slots;
}
function normalizeTime(t?: string) {
  return t?.slice(0, 5);
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  tables,
  interval = 30,
  shift = "night",
}: Props) {

  // 🔥 filtrar horarios por turno
  const validSchedules = schedules
    .filter((s) => s?.start_time && s?.end_time)
    .filter((s) => {
      const hour = Number(s.start_time!.slice(0, 2));
     return shift === "day"
  ? hour >= 6 && hour < 18
  : hour >= 18 || hour < 6;
    });

  if (!validSchedules.length) {
    return <div>No hay horarios configurados</div>;
  }

  let hours: string[] = [];

  validSchedules.forEach((s) => {
    const slots = generateSlots(
      s.start_time!.slice(0, 5),
      s.end_time!.slice(0, 5),
      interval
    );
    hours = [...hours, ...slots];
  });

  hours = [...new Set(hours)].sort();

  // 🔥 capacidad con fallback
  const maxCapacity = tables.length
    ? tables.reduce(
        (acc, t) => acc + (t.capacity ?? 0) * (t.quantity ?? 0),
        0
      )
    : 50;

  function peopleAtHour(time: string) {
    return appointments
      .filter((a) => {
        if (a.date !== date) return false;

        const t = normalizeTime(a.start_time || a.time);
        if (!t) return false;

        const [h1, m1] = t.split(":").map(Number);
        const [h2, m2] = time.split(":").map(Number);

        const minutesA = h1 * 60 + m1;
        const minutesSlot = h2 * 60 + m2;

        return minutesA === minutesSlot;
      })
      .reduce((sum, a) => sum + (a.people || 0), 0);
  }

  return (
    <div className="space-y-2">
      {hours.map((h) => {
        const people = peopleAtHour(h);
        const percent = (people / maxCapacity) * 100;

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

            <div className="text-xs w-16 text-right">
              {people} / {maxCapacity}
            </div>
          </div>
        );
      })}
    </div>
  );
}