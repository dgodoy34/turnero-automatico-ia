"use client";

import { useEffect, useState } from "react";
import TableFloorView from "@/components/TableFloorView";
import TableInventoryView from "@/components/TableInventoryView";

function todayLocalISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

export default function Mesas() {
  const [date, setDate] = useState(todayLocalISO());
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<"Día" | "Noche">("Día");
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  async function loadBusiness() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      // Aceptar ambos nombres por compatibilidad
      const id = data?.businessId ?? data?.business_id;
      if (id) {
        setBusinessId(id);
      } else {
        console.error("❌ La API de settings no devolvió business_id:", data);
      }
    } catch (err) {
      console.error("💥 Error de conexión con /api/settings:", err);
    } finally {
      setLoading(false);
    }
  }
  loadBusiness();
}, []);


  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Gestión de mesas</h1>

      {/* Selector de Fecha y Turno */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow">
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="border p-2 rounded"
        />
        <div className="flex border rounded overflow-hidden">
          {["Día", "Noche"].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedShift(s as any)}
              className={`px-4 py-2 ${selectedShift === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* SECCIÓN DE DATOS */}
      {!businessId && !loading ? (
        <div className="bg-yellow-100 p-4 rounded border border-yellow-400 text-yellow-800">
          ⚠️ Advertencia: No se detectó Business ID. Los componentes intentarán cargar con el ID por defecto.
        </div>
      ) : null}


      {/* PASO CLAVE: Si businessId es null, le pasamos un string vacío 
         para que el componente no explote pero sea "leído" por React.
      */}
      <TableInventoryView 
        date={date} 
        shift={selectedShift} 
        businessId={businessId || ""} 
      />

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4 text-xl">Plano de mesas</h2>
        <TableFloorView 
          date={date} 
          shift={selectedShift} 
          businessId={businessId || ""} 
        />
      </div>
    </div>
  );
}