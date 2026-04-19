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
  shift: "day" | "night";
  interval?: number;
};

function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];

  let [startH, startM] = start.split(":").map(Number);
  let [endH, endM] = end.split(":").map(Number);

  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;

  // 🔥 si cruza medianoche
  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  for (let t = startTotal; t <= endTotal; t += interval) {
    const display = t % (24 * 60);

    const h = Math.floor(display / 60);
    const m = display % 60;

    slots.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }

  return slots;
}

function normalizeTime(t?: string) {
  return t ? t.slice(0, 5) : null;
}

// 🔥 REDONDEO CLAVE
function roundToSlot(time: string, interval: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m;

  const rounded = Math.round(total / interval) * interval;

  const rh = Math.floor(rounded / 60);
  const rm = rounded % 60;

  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

// 🔥 ORDEN CORRECTO (CLAVE)
function sortHours(hours: string[]) {
  return hours.sort((a, b) => {
    const [ha, ma] = a.split(":").map(Number);
    const [hb, mb] = b.split(":").map(Number);

    const ta = ha < 6 ? ha + 24 : ha;
    const tb = hb < 6 ? hb + 24 : hb;

    return ta * 60 + ma - (tb * 60 + mb);
  });
}

export default function DayAgenda({
  appointments,
  date,
  schedules,
  shift,
  interval = 15,
}: Props) {

  // 🔥 FIX SWITCH REAL
  const filteredSchedules = schedules.filter((s) => {
    const startH = Number(s.start_time.slice(0, 2));
    const endH = Number(s.end_time.slice(0, 2));

    const crosses = endH < startH;

    if (shift === "day") return !crosses;
    if (shift === "night") return crosses || startH >= 18;

    return true;
  });

  let hours: string[] = [];

  filteredSchedules.forEach((s) => {
    hours.push(
      ...generateSlots(
        s.start_time.slice(0, 5),
        s.end_time.slice(0, 5),
        interval
      )
    );
  });

  hours = sortHours([...new Set(hours)]);

  function reservationsAtHour(time: string) {
    return appointments.filter((a) => {
      if (a.date !== date) return false;

      const t = normalizeTime(a.start_time || a.time);
      if (!t) return false;

      return roundToSlot(t, interval) === time;
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