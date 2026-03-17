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

<Link
href={`/admin/restaurants/detail?id=${r.id}`}
className="bg-black text-white px-3 py-2 rounded text-sm"
>
Administrar
</Link>

</div>

))}

</div>

)

}