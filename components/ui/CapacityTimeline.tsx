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
  shift: "day" | "night";
  interval?: number;
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  let [endH, endM] = end.split(":").map(Number);

  if (endH < h) {
    endH += 24;
  }

  while (h < endH || (h === endH && m <= endM)) {
    const displayH = h % 24;

    slots.push(
      `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );

    m += interval;
    if (m >= 60) {
      h++;
      m -= 60;
    }
  }

  return slots;
}

function normalizeTime(t?: string) {
  return t ? t.slice(0, 5) : null;
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  tables,
  shift,
  interval = 15,
}: Props) {

  // ✅ MISMO FIX DEL SWITCH
  const filteredSchedules = schedules.filter((s) => {
    if (!s.start_time || !s.end_time) return false;

    const startHour = Number(s.start_time.slice(0, 2));
    const endHour = Number(s.end_time.slice(0, 2));

    const crossesMidnight = endHour < startHour;

    if (shift === "day") {
      return !crossesMidnight;
    }

    if (shift === "night") {
      return crossesMidnight || startHour >= 18;
    }

    return true;
  });

  if (!filteredSchedules.length) {
    return <div>No hay horarios configurados</div>;
  }

  let hours: string[] = [];

  filteredSchedules.forEach((s) => {
    const slots = generateSlots(
      s.start_time.slice(0, 5),
      s.end_time.slice(0, 5),
      interval
    );
    hours = [...hours, ...slots];
  });

  hours = [...new Set(hours)].sort();

  const maxCapacity = tables.reduce(
    (acc, t) => acc + (t.capacity || 0) * (t.quantity || 0),
    0
  );

  function peopleAtHour(time: string) {
    return appointments
      .filter((a) => {
        if (a.date !== date) return false;

        const t = normalizeTime(a.start_time || a.time);
        return t === time;
      })
      .reduce((sum, a) => sum + (a.people || 0), 0);
  }

  return (
    <div className="space-y-2">
      {hours.map((h) => {
        const people = peopleAtHour(h);
        const percent = maxCapacity > 0 ? (people / maxCapacity) * 100 : 0;

        return (
          <div key={h} className="flex items-center gap-3">
            <div className="w-16 text-sm">{h}</div>

            <div className="flex-1 bg-gray-200 rounded h-4">
              <div
                className="bg-green-500 h-4 rounded"
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