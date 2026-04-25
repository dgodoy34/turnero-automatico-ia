"use client";

import { useEffect, useState } from "react";
import { useRestaurant } from "@/lib/useRestaurant";

type TableType = {
  capacity: number;
  quantity: number;
};

export default function DailyTableSetup({ date }: { date: string }) {
  const [tables, setTables] = useState<TableType[]>([]);
  const businessId = useRestaurant(); // 🔥 ahora claro

  async function loadInventory() {
    try {
      if (!businessId) return;

      const res = await fetch(
        `/api/table-inventory`
      );

      const data = await res.json();

      if (data?.tables) {
        setTables(data.tables);
      } else {
        setTables([]);
      }
    } catch (err) {
      console.error("Error cargando inventario", err);
      setTables([]);
    }
  }

  useEffect(() => {
    if (date && businessId) {
      loadInventory();
    }
  }, [date, businessId]);

  function updateQuantity(index: number, value: number) {
    const copy = [...tables];
    copy[index].quantity = value;
    setTables(copy);
  }

  async function saveOverride() {
    try {
      if (!businessId) return;

      const res = await fetch("/api/daily-table-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          tables,
          business_id: businessId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        alert("Error guardando configuración");
        return;
      }

      alert("Configuración guardada correctamente");
      loadInventory();
    } catch (err) {
      console.error("Error guardando override", err);
      alert("Error al guardar la configuración");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="font-semibold">
        Configuración de mesas para el día
      </h2>

      <div className="space-y-3">
        {tables.map((t, i) => (
          <div
            key={t.capacity}
            className="flex justify-between items-center border p-3 rounded"
          >
            <div>
              Mesa {t.capacity === 6 ? "6+" : t.capacity} personas
            </div>

            <input
              type="number"
              value={t.quantity}
              onChange={(e) => updateQuantity(i, Number(e.target.value))}
              className="border p-2 w-24 rounded"
            />
          </div>
        ))}
      </div>

      <button
        onClick={saveOverride}
        className="bg-blue-600 text-white px-6 py-2 rounded mt-4"
      >
        Guardar configuración para este día
      </button>
    </div>
  );
}