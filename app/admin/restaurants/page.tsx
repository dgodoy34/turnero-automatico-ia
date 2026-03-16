"use client";

import { useEffect, useState } from "react";

export default function RestaurantsPage(){

const [restaurants,setRestaurants] = useState<any[]>([]);

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

{restaurants.map((r)=>(
<div key={r.id} className="border p-4 rounded-lg">

<h2 className="font-semibold">
{r.name}
</h2>

</div>
))}

</div>

)

}