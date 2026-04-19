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
  interval?: number;
  shift?: "day" | "night";
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  let [endH, endM] = end.split(":").map(Number);

  const crossesMidnight = endH < h;

  while (true) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

    m += interval;
    if (m >= 60) {
      h++;
      m -= 60;
    }

    if (h === 24) h = 0;

    if (!crossesMidnight) {
      if (h > endH || (h === endH && m > endM)) break;
    } else {
      if (h === endH && m > endM) break;
    }
  }

  return slots;
}

function normalizeTime(t?: string) {
  return t?.slice(0, 5);
}

function matchTime(slot: string, time: string) {
  const [sh, sm] = slot.split(":").map(Number);
  const [th, tm] = time.split(":").map(Number);

  const slotMin = sh * 60 + sm;
  const timeMin = th * 60 + tm;

  return Math.abs(slotMin - timeMin) < 15;
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  tables,
  interval = 15,
  shift,
}: Props) {
  if (!schedules?.length) {
    return <div>No hay horarios configurados</div>;
  }

  // 🔥 filtro por turno
  const filteredSchedules = schedules.filter((s) => {
    const hour = parseInt(s.start_time.split(":")[0]);

    if (shift === "day") return hour < 17;
    if (shift === "night") return hour >= 17;

    return true;
  });

  let hours: string[] = [];

  filteredSchedules.forEach((s) => {
    const slots = generateSlots(s.start_time, s.end_time, interval);
    hours = [...hours, ...slots];
  });

  hours = [...new Set(hours)].sort();

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

        return matchTime(time, t);
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

            <div className="text-xs w-20 text-right">
              {people} / {maxCapacity}
            </div>
          </div>
        );
      })}
    </div>
  );
}