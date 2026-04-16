"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {

  const [name, setName] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // 🔥 NUEVO (usuarios)
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");

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

  

  // =========================
  // 🔥 CREATE USER
  // =========================
  async function createUser() {

    if (!newEmail || !newPass) {
      alert("Completar email y password");
      return;
    }

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: newEmail,
        password: newPass,
        role: "owner",
      }),
    });

    const data = await res.json();

    if (data.success) {
      alert("Usuario creado");
      setNewEmail("");
      setNewPass("");
    } else {
      alert(data.error || "Error creando usuario");
    }
  }
  // =========================
  // 🔥 FUNCTION RESTO ACTIVO
  // =========================

  
  async function toggleActive(id: string, current: boolean) {
  await fetch("/api/admin/toggle-restaurant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      active: !current,
    }),
  });

  await loadRestaurants(); // 🔥 IMPORTANTE
}

  // =========================
  // 🔥 CHANGE PASSWORD
  // =========================
  async function changePassword(userId: string) {

    const newPassword = prompt("Nueva contraseña");

    if (!newPassword) return;

    await fetch("/api/admin/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        new_password: newPassword,
      }),
    });

    alert("Password actualizada");
  }

  return (

    <div className="space-y-10">

      <h1 className="text-3xl font-bold">
        Panel Admin
      </h1>

      {/* ========================= */}
      {/* 🔥 STATS */}
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
      {/* 🔥 CREAR RESTAURANTE */}
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
      {/* 🔥 CREAR USUARIO */}
      {/* ========================= */}
      <div className="border p-6 rounded-lg space-y-3">

        <h2 className="font-semibold">Crear usuario</h2>

        <input
          className="border px-4 py-2 rounded w-full"
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />

        <input
          className="border px-4 py-2 rounded w-full"
          placeholder="Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />

        <button
          onClick={createUser}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Crear usuario
        </button>

      </div>

      {/* ========================= */}
      {/* 🔥 LISTADO */}
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

            </div>

            <div className="flex gap-2">

              <a
                href={`/admin/restaurants/detail?id=${r.id}`}
                className="bg-black text-white px-3 py-2 rounded text-sm"
              >
                Administrar
              </a>

              {/* 🔥 CAMBIAR PASSWORD DEMO */}
              <button
                onClick={() => changePassword(r.owner_user_id)}
                className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
              >
                Reset Pass
              </button>

              <button
  onClick={() => toggleActive(r.id, r.active)}
  className="bg-red-600 text-white px-3 py-2 rounded"
>
  {r.active ? "Desactivar" : "Activar"}
</button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}