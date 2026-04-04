"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {

  const [name,setName] = useState("");
  const [restaurants,setRestaurants] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);



  async function loadRestaurants(){

    try{

      const res = await fetch("/api/admin/restaurants");
      const data = await res.json();

      if(data.success){
        setRestaurants(data.restaurants);
      }

    }catch(err){

      console.error(err);

    }

  }



  useEffect(()=>{

    loadRestaurants();

  },[]);



  async function createRestaurant(){

    if(!name) return;

    setLoading(true);

    try{

      const res = await fetch("/api/admin/create-restaurant",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          name,
          email:`admin@${name}.com`,
          password:"123456"
        })
      });

      const text = await res.text();

      let data = null;

      if(text){
        data = JSON.parse(text);
      }

      setLoading(false);

      if(data?.success){

        setName("");

        loadRestaurants();

      }else{

        alert(data?.error || "Error creando restaurante");

      }

    }catch(err){

      console.error(err);

      setLoading(false);

      alert("Error del servidor");

    }

  }



  return (

    <div className="space-y-10">

      <h1 className="text-3xl font-bold">
        Panel Admin
      </h1>

<a href="/admin/chat-tester">Chat Tester</a>

      <div className="border p-6 rounded-lg flex gap-3">

        <input
          className="border px-4 py-2 rounded w-full"
          placeholder="Nombre del restaurante"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />

        <button
          onClick={createRestaurant}
          disabled={loading}
          className="bg-purple-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Creando..." : "Crear"}
        </button>

      </div>



      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Restaurantes
        </h2>



        {restaurants.map((r:any)=>(

          <div
            key={r.id}
            className="border p-4 rounded-lg flex justify-between items-center"
          >

            <div>

              <div className="font-semibold">
                {r.name}
              </div>

              <div className="text-sm text-gray-500">

                WhatsApp: {r.phone_number_id ? "🟢 conectado" : "🔴 no conectado"}

              </div>

              <div className="text-sm text-gray-500">

                Licencia: {r.restaurant_licenses?.[0]?.status || "sin licencia"}

              </div>

              <div className="text-sm text-gray-500">

                Plan: {r.restaurant_licenses?.[0]?.subscription_plans?.name || "-"}

              </div>

            </div>



            <a
href={`/admin/restaurants/detail?id=${r.id}`}
className="bg-black text-white px-3 py-2 rounded text-sm"
>
Administrar
</a>

          </div>

        ))}

      </div>

    </div>

  );

}