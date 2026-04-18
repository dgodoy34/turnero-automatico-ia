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
  shift?: "day" | "night";
  interval?: number;
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  let [endH, endM] = end.split(":").map(Number);

  const startTotal = h * 60 + m;
  let endTotal = endH * 60 + endM;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
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

export default function DayAgenda({
  appointments,
  date,
  schedules,
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

  function reservationsAtHour(time: string) {
    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const t = normalizeTime(a.start_time || a.time);
      if (!t) return false;

      return t === time;
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
              {reservations.length > 0 ? (
                reservations.map((r, i) => (
                  <div key={r.id || i}>
                    {r.clients?.name || "Reserva"} • {r.people}
                  </div>
                ))
              ) : (
                "Libre"
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}