"use client"

import { useEffect,useState } from "react"
import { useSearchParams } from "next/navigation"

export default function EditRestaurant(){

const searchParams = useSearchParams()
const id = searchParams.get("id")

const [restaurant,setRestaurant] = useState<any>(null)

const [name,setName] = useState("")
const [slug,setSlug] = useState("")
const [address,setAddress] = useState("")
const [ownerName,setOwnerName] = useState("")
const [phone,setPhone] = useState("")
const [email,setEmail] = useState("")

const [saving,setSaving] = useState(false)

useEffect(()=>{

if(!id) return

fetch(`/api/admin/restaurants?id=${id}`)
.then(r=>r.json())
.then(data=>{

if(data.success){

const r = data.restaurant

setRestaurant(r)

setName(r?.name || "")
setSlug(r?.slug || "")
setAddress(r?.address || "")
setOwnerName(r?.owner_name || "")
setPhone(r?.phone || "")
setEmail(r?.email || "")

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
name,
slug,
address,
owner_name:ownerName,
phone,
email
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

<a
href="/admin/restaurants"
className="text-sm text-blue-600"
>
← Volver a restaurantes
</a>

<div className="space-y-4">

<div>
<label className="text-sm">Nombre</label>
<input
value={name}
onChange={e=>setName(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>

<div>
<label className="text-sm">Slug (subdominio)</label>
<input
value={slug}
onChange={e=>setSlug(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>

<div>
<label className="text-sm">Dirección</label>
<input
value={address}
onChange={e=>setAddress(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>

<div>
<label className="text-sm">Responsable</label>
<input
value={ownerName}
onChange={e=>setOwnerName(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>

<div>
<label className="text-sm">Teléfono</label>
<input
value={phone}
onChange={e=>setPhone(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>

<div>
<label className="text-sm">Email</label>
<input
value={email}
onChange={e=>setEmail(e.target.value)}
className="border p-2 rounded w-full"
/>
</div>

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