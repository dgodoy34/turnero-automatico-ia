"use client";

import { useEffect, useState } from "react";

type TableType = {
  capacity: number;
  quantity: number;
};

// 🔥 RECIBE DATE DESDE AFUERA
export default function DailyTableSetup({ date }: { date: string }) {

  const [tables,setTables] = useState<TableType[]>([]);

  async function loadInventory(){

    try{

      const res = await fetch(`/api/table-inventory?date=${date}`);
      const data = await res.json();

      if(data?.tables){
        setTables(data.tables);
      }else{
        setTables([]);
      }

    }catch(err){
      console.error("Error cargando inventario",err);
    }

  }

  // 🔥 REACCIONA AL CAMBIO DE FECHA
  useEffect(()=>{
    if(date){
      loadInventory();
    }
  },[date]);


  function updateQuantity(index:number,value:number){

    const copy = [...tables];
    copy[index].quantity = value;

    setTables(copy);
  }

  async function saveOverride(){

    try{

      const res = await fetch("/api/daily-table-override",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          date,
          tables
        })
      });

      const data = await res.json();

      if(!res.ok || data.success === false){
        alert("Error guardando configuración");
        return;
      }

      alert("Configuración guardada");

      loadInventory();

    }catch(err){

      console.error("Error guardando override",err);
      alert("Error guardando configuración");

    }

  }


  return(

    <div className="bg-white rounded-xl shadow p-6 space-y-4">

      <h2 className="font-semibold">
        Configuración de mesas para el día
      </h2>

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
        type="button"
        onClick={saveOverride}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Guardar configuración
      </button>

    </div>

  );
}