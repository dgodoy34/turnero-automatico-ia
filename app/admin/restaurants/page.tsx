"use client"

import { useEffect, useState } from "react"

export default function RestaurantsPage(){

const [restaurants,setRestaurants] = useState<any[]>([])

useEffect(()=>{

fetch("/api/admin/restaurants")
.then(r=>r.json())
.then(data=>{
if(data.success){
setRestaurants(data.restaurants)
}
})

},[])

function formatDate(date:string){
if(!date) return "-"
return new Date(date).toLocaleDateString()
}

return(

<div className="space-y-6">

<h1 className="text-2xl font-bold">
Restaurantes
</h1>

<div className="grid gap-4">

{restaurants.map((r)=>{

const license = r.restaurant_licenses?.[0]

return(

<div
key={r.id}
className="border p-5 rounded-xl bg-white shadow-sm flex justify-between items-center"
>

<div className="space-y-1">

<h2 className="font-semibold text-lg">
{r.name}
</h2>

<div className="text-sm text-gray-600">

WhatsApp: {r.phone_number_id
? "🟢 conectado"
: "🔴 no conectado"}

</div>

<div className="text-sm">

Licencia: {" "}

<span className={
license?.status === "active"
? "text-green-600 font-semibold"
: "text-red-500"
}>
{license?.status || "sin licencia"}
</span>

</div>

<div className="text-sm text-gray-600">

Plan: {license?.subscription_plans?.name || "-"}

</div>

<div className="text-sm text-gray-600">

Expira: {formatDate(license?.expires_at)}

</div>

</div>

<div>

<a
href={`/admin/restaurants/${r.id}`}
className="bg-black text-white px-4 py-2 rounded-lg text-sm"
>
Administrar
</a>

</div>

</div>

)

})}

</div>

</div>

)

}