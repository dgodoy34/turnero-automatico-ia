"use client";

import { useEffect, useState } from "react";
import type { Appointment } from "@/types/Appointment";

type TableType = {
  capacity: number;
  quantity: number;
};

type Props = {
  appointments?: Appointment[];
  date: string;
};

export default function TableFloorView({ appointments = [], date }: Props) {
  const [tables, setTables] = useState<TableType[]>([]);

  async function loadTables() {
    if (!date) return;

    try {
      // ID real del restaurante (el que funcionaba antes)
      const restaurantId = "f9661b52-312d-46f6-9615-89aecfbb8a09";

      const res = await fetch(
        `/api/table-inventory?date=${date}&restaurant_id=${restaurantId}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Fetch falló");

      const data = await res.json();
      console.log("✅ Mesas recibidas desde API:", data.tables);
      setTables(data.tables || []);
    } catch (err) {
      console.error("❌ Error cargando mesas:", err);
      setTables([]);
    }
  }

  useEffect(() => {
    loadTables();
  }, [date]);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-6 text-2xl">Plano de mesas</h2>

      {tables.length === 0 ? (
        <div className="p-8 text-center text-amber-600 border border-amber-200 rounded-lg">
          Cargando mesas... (o no hay configuración para esta fecha)
        </div>
      ) : (
        <div className="space-y-8">
          {tables.map((t, i) => (
            <div key={i} className="border rounded-2xl p-6 bg-gray-50">
              <h3 className="font-semibold text-lg mb-4">
                Mesas de {t.capacity} personas — {t.quantity} mesas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: t.quantity }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-center hover:scale-105 transition-all"
                  >
                    <div className="text-4xl mb-2">🟢</div>
                    <div className="font-bold text-lg">Mesa {t.capacity} personas</div>
                    <div className="text-emerald-700 font-medium">Libre</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}