"use client";

import { useEffect, useState } from "react";

type TableType = {
  capacity: number;
  quantity: number;
};

export default function DailyTableSetup({ date }: { date: string }) {
  const [tables, setTables] = useState<TableType[]>([]);

  async function loadInventory() {
    try {
      const res = await fetch(`/api/table-inventory?date=${date}`);
      const data = await res.json();

      if (data?.tables) {
        setTables(data.tables);
      } else {
        setTables([]);
      }
    } catch (err) {
      console.error("Error cargando inventario", err);
    }
  }

  useEffect(() => {
    if (date) {
      loadInventory();
    }
  }, [date]);

  function updateQuantity(index: number, value: number) {
    const copy = [...tables];
    copy[index].quantity = value;
    setTables(copy);
  }

  async function saveOverride() {
    try {
      const res = await fetch("/api/daily-table-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          tables,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        alert("Error guardando configuración");
        return;
      }

      alert("Configuración guardada");
      loadInventory();
    } catch (err) {
      console.error("Error guardando override", err);
      alert("Error guardando configuración");
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
              Mesa {t.capacity} personas
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

      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-700 mb-3">
          Mapa de mesas
        </h3>

        <div className="flex flex-wrap gap-3">
          {tables.flatMap((t) =>
            Array.from({ length: t.quantity }).map((_, i) => (
              <div
                key={`${t.capacity}-${i}`}
                className="w-16 h-16 rounded-xl bg-indigo-500 text-white flex flex-col items-center justify-center shadow"
              >
                <span className="text-[10px] uppercase tracking-wide">
                  Mesa
                </span>
                <span className="text-lg font-bold">
                  {t.capacity}
                </span>
              </div>
            ))
          )}
        </div>
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
