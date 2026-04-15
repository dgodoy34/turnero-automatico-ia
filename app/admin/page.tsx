"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {

  const [name, setName] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadRestaurants() {
    const res = await fetch("/api/admin/restaurants");
    const data = await res.json();

    if (data.success) {
      setRestaurants(data.restaurants);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  async function createRestaurant() {
    if (!name) return;

    setLoading(true);

    const res = await fetch("/api/admin/create-restaurant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      setName("");
      loadRestaurants();
    } else {
      alert(data.error);
    }
  }

  return (
    <div className="p-8 space-y-6">

      <h1 className="text-3xl font-bold">
        Admin SaaS
      </h1>

      {/* CREAR */}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre restaurante"
          className="border px-4 py-2 rounded w-full"
        />

        <button
          onClick={createRestaurant}
          className="bg-purple-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Creando..." : "Crear"}
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-4">

        {restaurants.map((r) => (

          <div
            key={r.id}
            className="border p-4 rounded flex justify-between items-center"
          >

            <div>

              <div className="font-bold">
                {r.name}
              </div>

              <div className="text-sm text-gray-500">
                {r.slug}
              </div>

              <div className="text-sm text-blue-600">
                https://turiago.app/turnero/{r.slug}
              </div>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://turiago.app/turnero/${r.slug}`
                  );
                  alert("Link copiado");
                }}
                className="bg-green-600 text-white px-3 py-2 rounded text-sm"
              >
                Copiar
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}