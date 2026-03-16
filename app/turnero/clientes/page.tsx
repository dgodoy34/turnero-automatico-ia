"use client";

import { useEffect, useState } from "react";

type Client = {
id?:number
name:string
dni:string
phone?:string
email?:string
birthday?:string
created_at?:string
}


export default function Clientes(){

const [clients,setClients] = useState<Client[]>([]);
const [loading,setLoading] = useState(true);
const [selected,setSelected] = useState<Client | null>(null);

async function load(){

const res = await fetch("/api/clients");
const data = await res.json();

setClients(data.clients || []);
setLoading(false);

}

useEffect(()=>{
load();
},[]);

return(

<div className="space-y-6">

<h1 className="text-2xl font-bold">
Clientes
</h1>

<div className="bg-white rounded-xl shadow overflow-hidden">

<table className="w-full">

<thead className="border-b bg-gray-50">

<tr className="text-left text-sm text-gray-600">

<th className="p-3">Nombre</th>
<th className="p-3">DNI</th>
<th className="p-3">Teléfono</th>
<th className="p-3">Cumpleaños</th>
<th className="p-3">Email</th>


</tr>

</thead>

<tbody>

{loading && (

<tr>
<td className="p-4">Cargando...</td>
</tr>

)}

{clients.map(c => (

<tr
key={c.id ?? c.dni}
onClick={()=>setSelected(c)}
className="border-b hover:bg-gray-50 cursor-pointer"
>

<td className="p-3 font-semibold">
{c.name}
</td>

<td className="p-3">
{c.dni}
</td>

<td className="p-3">
{c.phone || "-"}
</td>

<td className="p-3">
{c.birthday || "-"}
</td>


<td className="p-3">
{c.email || "-"}
</td>


</tr>

))}

</tbody>

</table>

</div>


{/* MODAL CLIENTE */}

{selected && (

<div
className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
onClick={()=>setSelected(null)}
>

<div
className="bg-white p-6 rounded-xl w-[420px]"
onClick={(e)=>e.stopPropagation()}
>

<h2 className="text-xl font-bold mb-4">
Cliente
</h2>

<div className="space-y-2">

<div>
<b>Nombre:</b> {selected.name}
</div>

<div>
<b>DNI:</b> {selected.dni}
</div>

<div>
<b>Teléfono:</b> {selected.phone || "-"}
</div>

<div>
<b>Cumpleaños:</b> {selected.birthday || "-"}
</div>


<div>
<b>Email:</b> {selected.email || "-"}
</div>

</div>

<button
onClick={()=>setSelected(null)}
className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded w-full"
>
Cerrar
</button>

</div>

</div>

)}

</div>

)

}
