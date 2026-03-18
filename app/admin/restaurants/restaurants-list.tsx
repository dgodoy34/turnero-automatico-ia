"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function RestaurantsList(){

const [restaurants,setRestaurants] = useState<any[]>([])
const [loading,setLoading] = useState(true)

useEffect(()=>{

fetch("/api/admin/restaurants")
.then(r=>r.json())
.then(data=>{
if(data.success){
setRestaurants(data.restaurants || [])
}
setLoading(false)
})

},[])

async function deleteRestaurant(id:string){

if(!confirm("Eliminar restaurante?")) return

await fetch(`/api/admin/restaurants?id=${id}`,{
method:"DELETE"
})

setRestaurants(prev=>prev.filter(r=>r.id!==id))

}

if(loading){
return <div>Cargando...</div>
}

return(

<div className="space-y-4">

<h2 className="text-xl font-semibold">
Restaurantes
</h2>

{restaurants.map((r:any)=>(

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

<Link
href={`/admin/restaurants/detail?id=${r.id}`}
className="bg-black text-white px-3 py-2 rounded text-sm"
>
Administrar
</Link>

<Link
href={`/admin/restaurants/edit?id=${r.id}`}
className="bg-blue-600 text-white px-3 py-2 rounded text-sm"
>
Editar
</Link>

<Link
href={`/admin/licenses?id=${r.id}`}
className="bg-purple-600 text-white px-3 py-2 rounded text-sm"
>
Licencia
</Link>

<Link
href={`/admin/whatsapp?id=${r.id}`}
className="bg-green-600 text-white px-3 py-2 rounded text-sm"
>
WhatsApp
</Link>

<button
onClick={()=>deleteRestaurant(r.id)}
className="bg-red-600 text-white px-3 py-2 rounded text-sm"
>
Eliminar
</button>

</div>

</div>

))}

</div>

)

}