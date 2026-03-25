"use client";

import { useEffect, useState } from "react";

export default function RestaurantClock({ timezone }: { timezone: string }) {

  const [time, setTime] = useState("");

  useEffect(() => {

    function updateClock() {
      const formatted = new Intl.DateTimeFormat("es-AR", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date());

      setTime(formatted);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);

  }, [timezone]);

  return (
    <div className="text-right">
      <div className="text-sm text-gray-500">Hora local</div>
      <div className="font-semibold">{time}</div>
    </div>
  );
}