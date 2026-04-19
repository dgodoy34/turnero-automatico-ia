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
  start_time?: string;
  end_time?: string;
};

type Props = {
  appointments: Appointment[];
  date: string;
  schedules: Schedule[];
  interval?: number;
  shift?: "day" | "night"; // 👈 agregamos shift
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  while (h < endH || (h === endH && m <= endM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

    m += interval;
    if (m >= 60) {
      h++;
      m -= 60;
    }
  }

  return slots;
}

function normalizeTime(t?: string) {
  return t?.slice(0, 5);
}

export default function DayAgenda({
  appointments,
  date,
  schedules,
  interval = 30,
  shift = "night",
}: Props) {

  const validSchedules = schedules
    .filter((s) => s?.start_time && s?.end_time)
    .filter((s) => {
      const hour = Number(s.start_time!.slice(0, 2));
      return shift === "day" ? hour < 18 : hour >= 18;
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

  function reservationsAtHour(time: string) {
    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const t = normalizeTime(a.start_time || a.time);
      if (!t) return false;

      const [h1, m1] = t.split(":").map(Number);
      const [h2, m2] = time.split(":").map(Number);

      const minutesA = h1 * 60 + m1;
      const minutesSlot = h2 * 60 + m2;

      return Math.abs(minutesA - minutesSlot) < 15;
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