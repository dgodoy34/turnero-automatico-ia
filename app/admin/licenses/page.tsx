"use client"

import { useEffect,useState } from "react"

export default function LicensesPage(){

const [restaurants,setRestaurants] = useState([])
const [plans,setPlans] = useState([])
const [restaurant,setRestaurant] = useState("")
const [plan,setPlan] = useState("")
const [months,setMonths] = useState(1)

useEffect(()=>{

fetch("/api/admin/restaurants")
.then(r=>r.json())
.then(d=>setRestaurants(d.restaurants || []))

fetch("/api/admin/plans")
.then(r=>r.json())
.then(d=>setPlans(d.plans || []))

},[])

async function createLicense(){

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

}

return(

<div className="space-y-4">

<h1 className="text-2xl font-bold">
Crear Licencia
</h1>

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

{plans.map((p:any)=>(
<option key={p.id} value={p.id}>
{p.name}
</option>
))}

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

)

}