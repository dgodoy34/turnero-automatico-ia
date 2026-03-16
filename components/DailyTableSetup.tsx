"use client";

import { useEffect, useState } from "react";

type TableType = {
  capacity: number;
  quantity: number;
};

export default function DailyTableSetup() {

  const [tables,setTables] = useState<TableType[]>([]);
  const [date,setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function loadInventory(){

    const res = await fetch(`/api/table-inventory?date=${date}`);
    const data = await res.json();

    setTables(data.tables || []);
  }

  useEffect(()=>{
    loadInventory();
  },[]);

  function updateQuantity(index:number,value:number){

    const copy = [...tables];
    copy[index].quantity = value;

    setTables(copy);
  }

 async function saveOverride(){

const res = await fetch("/api/daily-table-override",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
date,
tables
})
})

if(!res.ok){
alert("Error guardando configuración")
return
}

alert("Configuración guardada")

// 🔥 FORZAR RECARGA DE LA PÁGINA
window.location.reload()

}



  return(

<div className="bg-white rounded-xl shadow p-6 space-y-4">

<h2 className="font-semibold">
Configuración de mesas para la noche
</h2>

<input
type="date"
value={date}
onChange={(e)=>setDate(e.target.value)}
className="border p-2 rounded"
/>

<div className="space-y-3">

{tables.map((t,i)=>(

<div
key={t.capacity}
className="flex justify-between items-center border p-3 rounded"
>

<div>
Mesa {t.capacity} personas
</div>

<input
type="number"
value={t.quantity}
onChange={(e)=>updateQuantity(i,Number(e.target.value))}
className="border p-2 w-24 rounded"
/>

</div>

))}

</div>

<button
onClick={saveOverride}
className="bg-indigo-600 text-white px-4 py-2 rounded"
>

Guardar configuración

</button>

</div>

  );
}