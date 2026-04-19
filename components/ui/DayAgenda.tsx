"use client";

type Appointment = {
  id?: number;
  date: string;
  start_time?: string;
  time?: string;
  people: number;
  clients?: {
    name?: string;
  };
};

type Schedule = {
  start_time: string;
  end_time: string;
};

type Props = {
  appointments: Appointment[];
  date: string;
  schedules: Schedule[];
  interval?: number;
  shift?: "day" | "night";
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

// 🔥 FIX REAL (NO DUPLICA)
function matchTime(slot: string, time: string, interval: number) {
  const [sh, sm] = slot.split(":").map(Number);
  const [th, tm] = time.split(":").map(Number);

  const slotMin = sh * 60 + sm;
  const timeMin = th * 60 + tm;

  return timeMin >= slotMin && timeMin < slotMin + interval;
}

export default function DayAgenda({
  appointments,
  date,
  schedules,
  interval = 15,
  shift,
}: Props) {
  if (!schedules?.length) {
    return <div>No hay horarios configurados</div>;
  }

  const filteredSchedules = schedules.filter((s) => {
    const hour = parseInt(s.start_time.split(":")[0]);

    if (shift === "day") return hour < 17;
    if (shift === "night") return hour >= 17;

    return true;
  });

  let hours: string[] = [];

  filteredSchedules.forEach((s) => {
    const slots = generateTimeSlots(s.start_time, s.end_time, interval);
    hours = [...hours, ...slots];
  });

  hours = Array.from(new Set(hours));

  // 🔥 orden correcto noche
  hours.sort((a, b) => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      let total = h * 60 + m;
      if (shift === "night" && h < 6) total += 24 * 60;
      return total;
    };
    return toMin(a) - toMin(b);
  });

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

        return (
          <div key={h} className="flex justify-between border-b pb-2">
            <div>{h}</div>

            <div className="text-right">
              {reservations.length > 0
                ? reservations.map((r, i) => (
                    <div key={r.id || i}>
                      {r.clients?.name || "walkin"} • {r.people}
                    </div>
                  ))
                : "Libre"}
            </div>
          </div>
        );
      })}
    </div>
  );
}