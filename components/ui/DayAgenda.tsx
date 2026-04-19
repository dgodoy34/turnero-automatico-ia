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
    const slots = generateSlots(s.start_time, s.end_time, interval);
    hours = [...hours, ...slots];
  });

  hours = [...new Set(hours)].sort();

  function reservationsAtHour(time: string) {
    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const t = normalizeTime(a.start_time || a.time);
      if (!t) return false;

      return matchTime(time, t);
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
                      {r.clients?.name || "Reserva"} • {r.people}
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