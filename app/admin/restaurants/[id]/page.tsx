"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function Page(){

const params = useParams()
const id = params?.id as string

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

return(

<div className="space-y-6">

<h1 className="text-2xl font-bold">
{restaurant.name}
</h1>

<div className="grid grid-cols-2 gap-4">

<div className="border p-4 rounded-lg">

<h2 className="font-semibold mb-2">
Licencia
</h2>

<div>Estado: {license?.status || "sin licencia"}</div>
<div>Plan: {license?.subscription_plans?.name || "-"}</div>
<div>Expira: {formatDate(license?.expires_at)}</div>

</div>

<div className="border p-4 rounded-lg">

<h2 className="font-semibold mb-2">
WhatsApp
</h2>

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