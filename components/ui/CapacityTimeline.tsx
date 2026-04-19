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
  shift: "day" | "night"; // 👈 AGREGAR
  tables: Table[];
  interval?: number;
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  let [endH, endM] = end.split(":").map(Number);

  let startMinutes = h * 60 + m;
  let endMinutes = endH * 60 + endM;

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

function toMinutes(t?: string) {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  shift, // 👈 AGREGAR
  tables,
  interval = 15,
}: Props) {
  if (!schedules?.length) {
    return <div>No hay horarios configurados</div>;
  }

  let hours: string[] = [];

  schedules.forEach((s) => {
    if (!s.start_time || !s.end_time) return;

    const slots = generateSlots(
      s.start_time.slice(0, 5),
      s.end_time.slice(0, 5),
      interval
    );

    hours = [...hours, ...slots];
  });

  hours = [...new Set(hours)].sort();

  const maxCapacity = tables.reduce(
    (acc, t) => acc + (t.capacity ?? 0) * (t.quantity ?? 0),
    0
  );

  function peopleAtHour(time: string) {
    const minutesSlot = toMinutes(time);

    hours = hours.filter((h) => {
  const hour = Number(h.split(":")[0]);

  return shift === "day"
    ? hour >= 6 && hour < 18
    : hour >= 18 || hour < 6;
});

    return appointments
      .filter((a) => {
        if (a.date !== date) return false;

        const minutesA = toMinutes(a.start_time || a.time);
        if (minutesA === null || minutesSlot === null) return false;

        // 🔥 FIX REAL (agrupa por intervalo)
        return (
          Math.floor(minutesA / interval) ===
          Math.floor(minutesSlot / interval)
        );
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