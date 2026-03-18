"use client"

import { useEffect,useState } from "react"
import { useSearchParams } from "next/navigation"

export default function LicensesPage(){

const searchParams = useSearchParams()
const restaurantId = searchParams.get("id")

const [restaurants,setRestaurants] = useState([])
const [plans,setPlans] = useState([])
const [licenses,setLicenses] = useState([])

useEffect(()=>{

async function load(){

const r = await fetch("/api/admin/restaurants")
const rjson = await r.json()
setRestaurants(rjson.restaurants || [])

const p = await fetch("/api/admin/plans")
const pjson = await p.json()
setPlans(pjson.plans || [])

let url = "/api/admin/licenses"

if(restaurantId){
url = `/api/admin/licenses?id=${restaurantId}`
}

const l = await fetch(url)
const ljson = await l.json()

setLicenses(ljson.licenses || [])

}

load()

},[restaurantId])

return(

<div>

<h1 className="text-2xl font-bold mb-4">
Licencias
</h1>

{licenses.map((l:any)=>(
<div key={l.id} className="border p-3 rounded mb-2">

<div>
Restaurante: {l.restaurants?.name}
</div>

<div>
Plan: {l.subscription_plans?.name}
</div>

<div>
Estado: {l.status}
</div>

<div>
Expira: {new Date(l.expires_at).toLocaleDateString()}
</div>

</div>
))}

</div>

)

}