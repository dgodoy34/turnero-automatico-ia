"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export default function RestaurantDetail(){

  const searchParams = useSearchParams()
  const id = searchParams.get("id")

  const [restaurant,setRestaurant] = useState<any>(null)

  useEffect(()=>{

    if(!id) return

    fetch(`/api/admin/restaurants?id=${id}`)
    .then(r=>r.json())
    .then(data=>{
      if(data.success){
        setRestaurant(data.restaurant)
      }
    })

  },[id])

  if(!restaurant){
    return <div>Cargando...</div>
  }

  const license = restaurant.restaurant_licenses?.[0]

  function formatDate(date:string){
    if(!date) return "-"
    return new Date(date).toLocaleDateString()
  }

  // 🔥 ACTIONS
  async function toggleActive(){
    await fetch("/api/admin/toggle-restaurant",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        id: restaurant.id,
        active: !restaurant.active
      })
    })

    location.reload()
  }

  async function resetPassword(){
    const newPass = prompt("Nueva contraseña")
    if(!newPass) return

    await fetch("/api/admin/change-password",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        user_id: restaurant.owner_user_id,
        new_password: newPass
      })
    })

    alert("Password actualizada")
  }

  return(

    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-2xl font-bold">
            {restaurant.name}
          </h1>

          <div className="text-sm text-gray-500">
            Estado: {restaurant.active ? "🟢 Activo" : "🔴 Inactivo"}
          </div>
        </div>

        <div className="flex gap-2">

          <button
            onClick={toggleActive}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            {restaurant.active ? "Desactivar" : "Activar"}
          </button>

          <button
            onClick={resetPassword}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            Reset Pass
          </button>

          <a
            href={`/admin/restaurants/edit?id=${restaurant.id}`}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Editar
          </a>

        </div>

      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 gap-4">

        {/* LICENCIA */}
        <div className="border p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Licencia</h2>
          <div>Estado: {license?.status || "sin licencia"}</div>
          <div>Plan: {license?.subscription_plans?.name || "-"}</div>
          <div>Expira: {formatDate(license?.expires_at)}</div>
        </div>

        {/* WHATSAPP */}
        <div className="border p-4 rounded-lg">
          <h2 className="font-semibold mb-2">WhatsApp</h2>
          <div>
            Estado: {restaurant.phone_number_id
              ? "🟢 conectado"
              : "🔴 no conectado"}
          </div>
        </div>

      </div>

    </div>

  )

}