"use client"

import { useEffect,useState } from "react"
import { useSearchParams } from "next/navigation"

export default function LicensesPage(){

const searchParams = useSearchParams()
const restaurantId = searchParams.get("id")

const [restaurants,setRestaurants] = useState<any[]>([])
const [plans,setPlans] = useState<any[]>([])
const [licenses,setLicenses] = useState<any[]>([])

const [restaurant,setRestaurant] = useState("")
const [plan,setPlan] = useState("")
const [months,setMonths] = useState(1)

useEffect(()=>{
loadData()
},[restaurantId])

async function loadData(){

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

if(restaurantId){
url = `/api/admin/licenses?id=${restaurantId}`
}

const l = await fetch(url)
const ljson = await l.json()

if(ljson.success){
setLicenses(ljson.licenses || [])
}

}

async function createLicense(){

    console.log("restaurant",restaurant)
console.log("plan",plan)


await fetch("/api/admin/licenses",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({
restaurant_id:restaurant,
plan_id:plan,
months
})
})

alert("Licencia creada")

loadData()

}

async function updateStatus(id:string,status:string){

await fetch("/api/admin/licenses",{
method:"PATCH",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({
id,
status
})
})

loadData()

}

async function deleteLicense(id:string){

if(!confirm("Eliminar licencia?")) return

await fetch(`/api/admin/licenses?id=${id}`,{
method:"DELETE"
})

loadData()

}

return(

<div className="space-y-6">

<h1 className="text-2xl font-bold">
Licencias
</h1>

{/* Crear licencia */}

<div className="space-y-3 border p-4 rounded">

<h2 className="font-semibold">
Crear Licencia
</h2>

<select onChange={(e)=>setRestaurant(e.target.value)}>
<option>Restaurante</option>

{restaurants.map((r:any)=>(
<option key={r.id} value={r.id}>
{r.name}
</option>
))}

</select>

<select onChange={(e)=>setPlan(e.target.value)}>
<option>Plan</option>

<select
value={plan}
onChange={(e)=>setPlan(e.target.value)}
>
<option value="">Plan</option>

{plans.map((p:any)=>(
<option key={p.id} value={p.id}>
{p.name}
</option>
))}

</select>

</select>

<input
type="number"
value={months}
onChange={(e)=>setMonths(Number(e.target.value))}
/>

<button
onClick={createLicense}
className="bg-purple-600 text-white px-4 py-2 rounded"
>
Activar licencia
</button>

</div>

{/* Lista licencias */}

<div className="space-y-3">

<h2 className="font-semibold">
Licencias activas
</h2>

{licenses.map((l:any)=>(

<div
key={l.id}
className="border p-3 rounded flex justify-between items-center"
>

<div>

<div className="font-semibold">
{l.restaurants?.name}
</div>

<div className="text-sm text-gray-500">
Plan: {l.subscription_plans?.name}
</div>

<div className="text-sm">
Estado: {l.status}
</div>

<div className="text-sm">
Expira: {new Date(l.expires_at).toLocaleDateString()}
</div>

</div>

<div className="flex gap-2">

<button
onClick={()=>updateStatus(l.id,"active")}
className="bg-green-600 text-white px-3 py-1 rounded text-sm"
>
Activar
</button>

<button
onClick={()=>updateStatus(l.id,"suspended")}
className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
>
Suspender
</button>

<button
onClick={()=>deleteLicense(l.id)}
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