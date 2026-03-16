"use client"

import { useEffect,useState } from "react"

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

return(

<div className="space-y-6">

<h1 className="text-2xl font-bold">
Restaurantes
</h1>

{restaurants.map((r)=>{

const license = r.restaurant_licenses?.[0]

return(

<div key={r.id} className="border p-4 rounded-lg space-y-2">

<h2 className="font-semibold">
{r.name}
</h2>

<div className="text-sm text-gray-600">

Estado:

{license
? license.status
: "sin licencia"}

</div>

<div className="text-sm text-gray-600">

Plan:

{license?.subscription_plans?.name || "-"}

</div>

<div className="text-sm text-gray-600">

Expira:

{license?.expires_at || "-"}

</div>

</div>

)

})}

</div>

)

}