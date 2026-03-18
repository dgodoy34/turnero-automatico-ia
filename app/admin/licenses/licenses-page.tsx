"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export default function LicensesPage() {

  const searchParams = useSearchParams()
  const restaurantId = searchParams.get("id")

  const [restaurants, setRestaurants] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [licenses, setLicenses] = useState<any[]>([])

  const [restaurant, setRestaurant] = useState("")
  const [plan, setPlan] = useState("")
  const [months, setMonths] = useState(1)

  useEffect(() => {
    loadData()
  }, [restaurantId])

  async function loadData() {

    // restaurantes
    const r = await fetch("/api/admin/restaurants")
    const rjson = await r.json()
    setRestaurants(rjson.restaurants || [])

    // planes
    const p = await fetch("/api/admin/plans")
    const pjson = await p.json()
    setPlans(pjson.plans || [])

    // licencias
    let url = "/api/admin/licenses"

    if (restaurantId) {
      url = `/api/admin/licenses?id=${restaurantId}`
    }

    const l = await fetch(url)
    const ljson = await l.json()

    if (ljson.success) {
      setLicenses(ljson.licenses || [])
    }
  }

  async function createLicense() {

    if (!restaurant || !plan) {
      alert("Seleccioná restaurante y plan")
      return
    }

    await fetch("/api/admin/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurant,
        plan_id: plan,
        months
      })
    })

    alert("Licencia creada")
    loadData()
  }

  async function updateStatus(id: string, status: string) {

    await fetch("/api/admin/licenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status
      })
    })

    loadData()
  }

  async function deleteLicense(id: string) {

    if (!confirm("Eliminar licencia?")) return

    await fetch(`/api/admin/licenses?id=${id}`, {
      method: "DELETE"
    })

    loadData()
  }

  return (

    <div className="space-y-6">

      <h1 className="text-2xl font-bold text-gray-800">
        Gestión de Licencias
      </h1>

      {/* ========================= */}
      {/* CREAR LICENCIA */}
      {/* ========================= */}

      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-4">

        <h2 className="text-lg font-semibold text-gray-800">
          Crear nueva licencia
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Restaurante */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-500 mb-1">
              Restaurante
            </label>

            <select
              className="border rounded-lg px-3 py-2"
              value={restaurant}
              onChange={(e) => setRestaurant(e.target.value)}
            >
              <option value="">Seleccionar</option>

              {restaurants.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plan */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-500 mb-1">
              Plan
            </label>

            <select
              className="border rounded-lg px-3 py-2"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="">Seleccionar</option>

              {plans.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duración */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-500 mb-1">
              Duración (meses)
            </label>

            <input
              type="number"
              min={1}
              className="border rounded-lg px-3 py-2"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            />
          </div>

        </div>

        <button
          onClick={createLicense}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white px-6 py-2 rounded-lg font-medium"
        >
          Activar licencia
        </button>

      </div>

      {/* ========================= */}
      {/* LISTA LICENCIAS */}
      {/* ========================= */}

      <div className="space-y-3">

        <h2 className="font-semibold text-gray-700">
          Licencias activas
        </h2>

        {licenses.length === 0 && (
          <div className="text-gray-500 text-sm">
            No hay licencias aún
          </div>
        )}

        {licenses.map((l: any) => (

          <div
            key={l.id}
            className="border rounded-lg p-4 flex justify-between items-center bg-white shadow-sm"
          >

            <div className="space-y-1">

              <div className="font-semibold text-lg">
                {l.restaurants?.name}
              </div>

              <div className="text-xs text-gray-400">
                ID: {l.id}
              </div>

              <div className="text-sm">
                Plan: <b>{l.subscription_plans?.name}</b>
              </div>

              <div className="text-sm text-gray-600">
                Usuarios: {l.subscription_plans?.max_users ?? "-"} | Reservas: {l.subscription_plans?.max_reservations ?? "-"}
              </div>

              <div className="text-sm">
                Estado:{" "}
                <span className={
                  l.status === "active"
                    ? "text-green-600 font-semibold"
                    : "text-yellow-600 font-semibold"
                }>
                  {l.status}
                </span>
              </div>

              <div className="text-sm">
                Expira: {l.expires_at
                  ? new Date(l.expires_at).toLocaleDateString()
                  : "-"
                }
              </div>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() => updateStatus(l.id, "active")}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Activar
              </button>

              <button
                onClick={() => updateStatus(l.id, "suspended")}
                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
              >
                Suspender
              </button>

              <button
                onClick={() => deleteLicense(l.id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Eliminar
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}