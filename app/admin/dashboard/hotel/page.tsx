"use client";

import { useEffect, useState } from "react";

export default function HotelAdminPage() {

  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  async function loadData() {
    try {
      const res = await fetch("/api/admin/hotel/dashboard");
      const data = await res.json();

      if (data.success) {
        setStats(data);
        setBookings(data.latest || []);
      }

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (

    <div className="space-y-10">

      <h1 className="text-3xl font-bold">
        🏨 Dashboard Hotel
      </h1>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">

          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">
              Reservas totales
            </div>
            <div className="text-2xl font-bold">
              {stats.totalBookings}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">
              Check-ins hoy
            </div>
            <div className="text-2xl font-bold">
              {stats.todayBookings}
            </div>
          </div>

        </div>
      )}

      {/* LISTADO */}
      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Últimas reservas
        </h2>

        {bookings.map((b: any) => (

          <div
            key={b.id}
            className="border p-4 rounded-lg"
          >

            <div>📅 {b.check_in} → {b.check_out}</div>
            <div>👥 {b.guests}</div>
            <div>🛏️ {b.room_type}</div>
            <div className="text-sm text-gray-500">
              {b.phone}
            </div>

          </div>

        ))}

      </div>

    </div>
  );
}