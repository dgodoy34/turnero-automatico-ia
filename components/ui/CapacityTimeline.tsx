"use client";

type Appointment = {
  id: number;
  date: string;
  start_time?: string;
  time?: string;
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
  tables: Table[];
  shift?: "day" | "night";
  interval?: number;
};

// 🔥 soporta horarios nocturnos (cruce de día)
function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  let [endH, endM] = end.split(":").map(Number);

  const startTotal = h * 60 + m;
  let endTotal = endH * 60 + endM;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60; // cruce de medianoche
  }

  let current = startTotal;

  while (current <= endTotal) {
    const hour = Math.floor(current / 60) % 24;
    const min = current % 60;

    slots.push(
      `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    );

    current += interval;
  }

  return slots;
}

function normalizeTime(t?: string) {
  return t ? t.slice(0, 5) : null;
}

function isNightTime(time: string) {
  const hour = Number(time.split(":")[0]);
  return hour >= 18 || hour < 6;
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  tables,
  shift = "night",
  interval = 30,
}: Props) {

  if (!schedules?.length) {
    return <div>No hay horarios configurados</div>;
  }

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

  // 🔥 FILTRO POR SHIFT
  hours = hours.filter((h) =>
    shift === "day" ? !isNightTime(h) : isNightTime(h)
  );

  const maxCapacity = tables.reduce(
    (acc, t) => acc + (t.capacity ?? 0) * (t.quantity ?? 0),
    0
  );

  function peopleAtHour(time: string) {
    return appointments
      .filter((a) => {
        if (a.date !== date) return false;

        const t = normalizeTime(a.start_time || a.time);
        if (!t) return false;

        return t === time;
      })
      .reduce((sum, a) => sum + (a.people || 0), 0);
  }

  return (
    <div className="space-y-2">
      {hours.map((h) => {
        const people = peopleAtHour(h);
        const percent = maxCapacity > 0 ? (people / maxCapacity) * 100 : 0;

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