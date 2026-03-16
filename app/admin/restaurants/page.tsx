"use client"

import { useEffect,useState } from "react"

export default function RestaurantAdminPage({params}:any){

const [restaurant,setRestaurant] = useState<any>(null)

useEffect(()=>{

fetch(`/api/admin/restaurants/${params.id}`)
.then(r=>r.json())
.then(data=>{
if(data.success){
setRestaurant(data.restaurant)
}
})

},[params.id])

if(!restaurant){
return <div>Cargando...</div>
}

const license = restaurant.restaurant_licenses?.[0]

function formatDate(date:string){
if(!date) return "-"
return new Date(date).toLocaleDateString()
}

return(

<div className="space-y-6">

<h1 className="text-2xl font-bold">
{restaurant.name}
</h1>

<div className="grid grid-cols-2 gap-4">

{/* Licencia */}

<div className="border p-4 rounded-lg bg-white">

<h2 className="font-semibold mb-2">
Licencia
</h2>

<div className="text-sm">
Estado: {license?.status || "sin licencia"}
</div>

<div className="text-sm">
Plan: {license?.subscription_plans?.name || "-"}
</div>

<div className="text-sm">
Expira: {formatDate(license?.expires_at)}
</div>

</div>

{/* WhatsApp */}

<div className="border p-4 rounded-lg bg-white">

<h2 className="font-semibold mb-2">
WhatsApp
</h2>

<div className="text-sm">

Estado: {restaurant.phone_number_id
? "🟢 conectado"
: "🔴 no conectado"}

</div>

<div className="text-sm">
Número: {restaurant.phone_number_id || "-"}
</div>

</div>

{/* Usuarios */}

<div className="border p-4 rounded-lg bg-white">

<h2 className="font-semibold mb-2">
Usuarios
</h2>

<div className="text-sm">
Usuarios activos: {restaurant.restaurant_users?.length || 0}
</div>

</div>

{/* Acciones */}

<div className="border p-4 rounded-lg bg-white">

<h2 className="font-semibold mb-2">
Acciones
</h2>

<div className="flex gap-2">

<a
href={`/admin/licenses`}
className="bg-purple-600 text-white px-3 py-2 rounded text-sm"
>
Renovar licencia
</a>

<a
href={`/admin/whatsapp`}
className="bg-green-600 text-white px-3 py-2 rounded text-sm"
>
Configurar WhatsApp
</a>

<a
href={`/turnero`}
className="bg-black text-white px-3 py-2 rounded text-sm"
>
Abrir panel restaurante
</a>

</div>

</div>

</div>

</div>

)

}