"use client"

import { useEffect,useState } from "react"
import { useSearchParams } from "next/navigation"

export default function EditRestaurantPage(){

const searchParams = useSearchParams()
const id = searchParams.get("id")

const [restaurant,setRestaurant] = useState<any>(null)
const [name,setName] = useState("")
const [saving,setSaving] = useState(false)

useEffect(()=>{

if(!id) return

fetch(`/api/admin/restaurants?id=${id}`)
.then(r=>r.json())
.then(data=>{
if(data.success){

const r = data.restaurants?.[0]

setRestaurant(r)
setName(r?.name || "")

}
})

},[id])

async function save(){

setSaving(true)

await fetch("/api/admin/restaurants",{
method:"PUT",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
id,
name
})
})

setSaving(false)

alert("Restaurante actualizado")

}

if(!restaurant){
return <div>Cargando...</div>
}

return(

<div className="space-y-6 max-w-xl">

<h1 className="text-2xl font-bold">
Editar Restaurante
</h1>

<div className="space-y-2">

<label className="text-sm">
Nombre
</label>

<input
value={name}
onChange={e=>setName(e.target.value)}
className="border p-2 rounded w-full"
/>

</div>

<button
onClick={save}
className="bg-blue-600 text-white px-4 py-2 rounded"
>
{saving ? "Guardando..." : "Guardar"}
</button>

</div>

)

}