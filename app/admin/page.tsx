"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {

  const [name, setName] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // =========================
  // 🔹 STATS
  // =========================
  async function loadStats() {
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();

      if (data.success) {
        setStats(data);
      }

    } catch (err) {
      console.error(err);
    }
  }

  // =========================
  // 🔹 RESTAURANTS
  // =========================
  async function loadRestaurants() {
    try {
      const res = await fetch("/api/admin/restaurants");
      const data = await res.json();

      if (data.success) {
        setRestaurants(data.restaurants);
      }

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadRestaurants();
    loadStats();
  }, []);

  // =========================
  // 🔹 CREATE RESTAURANT
  // =========================
  async function createRestaurant() {

    if (!name) return;

    setLoading(true);

    try {

      const res = await fetch("/api/admin/create-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: `admin@${name}.com`,
          password: "123456"
        })
      });

      const data = await res.json();

      setLoading(false);

      if (data?.success) {
        setName("");
        loadRestaurants();
        loadStats();
      } else {
        alert(data?.error || "Error creando restaurante");
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Error del servidor");
    }
  }

  return (

    <div className="space-y-10">

      <h1 className="text-3xl font-bold">
        Panel Admin
      </h1>

      {/* ========================= */}
      {/* 🔥 DASHBOARD STATS */}
      {/* ========================= */}
      {stats && (

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500">Restaurantes</div>
            <div className="text-2xl font-bold">{stats.totalRestaurants}</div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500">Reservas totales</div>
            <div className="text-2xl font-bold">{stats.totalReservations}</div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500">Reservas hoy</div>
            <div className="text-2xl font-bold">{stats.todayReservations}</div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-500">Top restaurante</div>
            <div className="text-lg font-bold">
              {stats.topRestaurant || "-"}
            </div>
          </div>

        </div>

      )}

      {/* ========================= */}
      {/* 🔥 PERFORMANCE RESTAURANTES */}
      {/* ========================= */}
      {stats?.restaurantStats && (

        <div className="space-y-3">

          <h2 className="text-xl font-semibold">
            Performance por restaurante
          </h2>

          {stats.restaurantStats.map((r: any) => (

            <div
              key={r.id || r.name}
              className="border rounded-lg p-4 bg-white shadow-sm flex justify-between"
            >

              <div>
                <div className="font-semibold">{r.name}</div>

                <div className="text-sm text-gray-500">
                  Reservas: {r.total_reservations}
                </div>

                <div className="text-sm text-gray-500">
                  Clientes únicos: {r.unique_clients}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400">
                  Promedio
                </div>
                <div className="font-bold">
                  {(r.total_reservations / (r.unique_clients || 1)).toFixed(1)}
                </div>
              </div>

            </div>

          ))}

        </div>

      )}

      {/* ========================= */}
      {/* CREAR RESTAURANTE */}
      {/* ========================= */}
      <div className="border p-6 rounded-lg flex gap-3">

        <input
          className="border px-4 py-2 rounded w-full"
          placeholder="Nombre del restaurante"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={createRestaurant}
          disabled={loading}
          className="bg-purple-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Creando..." : "Crear"}
        </button>

      </div>

      {/* ========================= */}
      {/* LISTADO */}
      {/* ========================= */}
      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Restaurantes
        </h2>

        {restaurants.map((r: any) => (

          <div
            key={r.id}
            className="border p-4 rounded-lg flex justify-between items-center"
          >

            <div>

              <div className="font-semibold">
                {r.name}
              </div>

              <div className="text-sm text-gray-500">
                WhatsApp: {r.phone_number_id ? "🟢 conectado" : "🔴 no conectado"}
              </div>

              <div className="text-sm text-gray-500">
                Licencia: {r.restaurant_licenses?.[0]?.status || "sin licencia"}
              </div>

              <div className="text-sm text-gray-500">
                Plan: {r.restaurant_licenses?.[0]?.subscription_plans?.name || "-"}
              </div>

            </div>

            <div className="flex gap-2">

              <a
                href={`/admin/restaurants/detail?id=${r.id}`}
                className="bg-black text-white px-3 py-2 rounded text-sm"
              >
                Administrar
              </a>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}