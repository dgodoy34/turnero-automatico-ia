"use client";

type Appointment = {
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

function generateTimeSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const toTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  let startMin = toMinutes(start);
  let endMin = toMinutes(end);

  if (endMin <= startMin) {
    for (let t = startMin; t < 24 * 60; t += interval) {
      slots.push(toTime(t));
    }
    for (let t = 0; t <= endMin; t += interval) {
      slots.push(toTime(t));
    }
  } else {
    for (let t = startMin; t <= endMin; t += interval) {
      slots.push(toTime(t));
    }
  }

  return slots;
}

function normalizeTime(t?: string) {
  return t?.slice(0, 5);
}

function matchTime(slot: string, time: string, interval: number) {
  const [sh, sm] = slot.split(":").map(Number);
  const [th, tm] = time.split(":").map(Number);

  const slotMin = sh * 60 + sm;
  const timeMin = th * 60 + tm;

  return timeMin >= slotMin && timeMin < slotMin + interval;
}

export default function CapacityTimeline({
  appointments,
  date,
  schedules,
  tables,
  shift,
  interval = 15,
}: Props) {
  if (!schedules?.length) {
    return <div>No hay horarios configurados</div>;
  }

  // 🔥 FILTRO DIA / NOCHE
  const filteredSchedules = schedules.filter((s) => {
    const hour = parseInt(s.start_time.split(":")[0]);

    if (shift === "day") return hour < 17;
    if (shift === "night") return hour >= 17;

    return true;
  });

  // 🔥 GENERAR HORARIOS
  let hours: string[] = [];

  filteredSchedules.forEach((s) => {
    const slots = generateTimeSlots(s.start_time, s.end_time, interval);
    hours = [...hours, ...slots];
  });

  hours = Array.from(new Set(hours));

  // 🔥 ORDEN NOCHE CORRECTO
  hours.sort((a, b) => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      let total = h * 60 + m;

      if (shift === "night" && h < 6) total += 24 * 60;

      return total;
    };

    return toMin(a) - toMin(b);
  });

  // 🔥 CAPACIDAD REAL
  const totalCapacity = tables.reduce(
    (acc, t) => acc + t.capacity * t.quantity,
    0
  );

  function reservationsAtHour(time: string) {
    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const t = normalizeTime(a.start_time || a.time);
      if (!t) return false;

      return matchTime(time, t, interval);
    });
  }

  return (
    <div className="space-y-2">
      {hours.map((h) => {
        const reservations = reservationsAtHour(h);

        const occupied = reservations.reduce(
          (acc, r) => acc + r.people,
          0
        );

        const percent =
          totalCapacity > 0
            ? (occupied / totalCapacity) * 100
            : 0;

        return (
          <div key={h} className="flex items-center gap-2">
            <div className="w-16 text-sm">{h}</div>

            <div className="flex-1 bg-gray-200 rounded h-3 relative">
              <div
                className="bg-green-500 h-3 rounded"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="w-20 text-right text-sm">
              {occupied} / {totalCapacity}
            </div>
          </div>
        );
      })}
    </div>
  );
}