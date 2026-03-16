"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RestaurantPage() {

  const params = useParams();
  const id = params.id as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(0);



  async function loadRestaurant() {

    const res = await fetch(`/api/admin/restaurants/${id}`);
    const data = await res.json();

    if(data.success){

      setRestaurant(data.restaurant);
      setName(data.restaurant.name || "");
      setMaxCapacity(data.restaurant.max_capacity || 0);

    }

    setLoading(false);

  }



  useEffect(()=>{

    if(id){
      loadRestaurant();
    }

  },[id]);



  async function saveRestaurant(){

    await fetch(`/api/admin/restaurants/${id}`,{
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        name,
        max_capacity:maxCapacity
      })
    });

    alert("Restaurante actualizado");

  }



  if(loading){

    return <div>Cargando...</div>

  }



  return(

    <div className="space-y-8">

      <h1 className="text-2xl font-bold">
        Editar Restaurante
      </h1>


      <div className="border p-6 rounded-lg space-y-4">

        <h2 className="font-semibold">
          Datos del restaurante
        </h2>


        <div className="space-y-2">

          <label>Nombre</label>

          <input
            className="border px-3 py-2 rounded w-full"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />

        </div>


        <div className="space-y-2">

          <label>Capacidad máxima</label>

          <input
            type="number"
            className="border px-3 py-2 rounded w-full"
            value={maxCapacity}
            onChange={(e)=>setMaxCapacity(Number(e.target.value))}
          />

        </div>


        <button
          onClick={saveRestaurant}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Guardar cambios
        </button>

      </div>

    </div>

  )

}