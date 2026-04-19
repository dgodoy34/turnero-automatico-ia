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
  shift: "day" | "night"; // 👈 AGREGAR
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

  export default function DayAgenda({
    appointments,
    date,
    schedules,
    shift, // 👈 AGREGAR
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

  function reservationsAtHour(time: string) {
    const minutesSlot = toMinutes(time);

  hours = hours.filter((h) => {
  return schedules.some((s) => {
    const start = s.start_time.slice(0, 5);
    const end = s.end_time.slice(0, 5);

    if (shift === "day") {
      return start < "18:00";
    }

    if (shift === "night") {
      return start >= "18:00" || end < "06:00";
    }

    return true;
  });
});

    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const minutesA = toMinutes(a.start_time || a.time);
      if (minutesA === null || minutesSlot === null) return false;

      // 🔥 FIX REAL (agrupa por intervalo)
      return (
        Math.floor(minutesA / interval) ===
        Math.floor(minutesSlot / interval)
      );
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