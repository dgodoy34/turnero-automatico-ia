"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TableConfig = {
  capacity: number;
  quantity: number;
};

type Shift = {
  name: string;
  start_time: string;
  end_time: string;
  tables: TableConfig[];
};

const RESTAURANT_ID = "f9661b52-312d-46f6-9615-89aecfbb8a09";

export default function Configuracion() {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [selectedShiftIndex, setSelectedShiftIndex] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const currentShift = shifts[selectedShiftIndex];

  // 🔹 cargar desde DB
  async function loadShifts() {
    try {
      let { data } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("date", date);

      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from("restaurant_table_inventory")
          .select("*")
          .eq("restaurant_id", RESTAURANT_ID)
          .is("date", null);

        data = fallback || [];
      }

      const grouped: any = {};

      data.forEach((row: any) => {
        const key = `${row.start_time}-${row.end_time}`;

        if (!grouped[key]) {
          grouped[key] = {
            name: `${row.start_time} - ${row.end_time}`,
            start_time: row.start_time,
            end_time: row.end_time,
            tables: []
          };
        }

        grouped[key].tables.push({
          capacity: row.capacity,
          quantity: row.quantity
        });
      });

      const result = Object.values(grouped) as Shift[];

      const finalShifts: Shift[] =
        result.length > 0
          ? result
          : [
              {
                name: "12:00 - 16:00",
                start_time: "12:00",
                end_time: "16:00",
                tables: [
                  { capacity: 2, quantity: 0 },
                  { capacity: 4, quantity: 0 },
                  { capacity: 6, quantity: 0 }
                ]
              }
            ];

      setShifts(finalShifts);
      setSelectedShiftIndex(0);

    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadShifts();
  }, [date]);

  // 🔹 guardar
  async function saveShifts() {
    try {
      await supabase
        .from("restaurant_table_inventory")
        .delete()
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("date", date);

      const rows = shifts.flatMap((shift) =>
        shift.tables.map((t) => ({
          restaurant_id: RESTAURANT_ID,
          date: date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          capacity: t.capacity,
          quantity: t.quantity,
        }))
      );

      const { error } = await supabase
        .from("restaurant_table_inventory")
        .insert(rows);

      if (error) {
        alert("Error al guardar: " + error.message);
        return;
      }

      alert("✅ Configuración guardada correctamente");
      await loadShifts();

    } catch (err) {
      alert("Error inesperado");
    }
  }

  // 🔥 copiar a la semana
  async function copyToWeek() {
    try {
      const baseDate = new Date(date);

      const days = [0,1,2,3,4,5,6].map((d) => {
        const newDate = new Date(baseDate);
        newDate.setDate(baseDate.getDate() + d);
        return newDate.toISOString().split("T")[0];
      });

      for (const d of days) {
        await supabase
          .from("restaurant_table_inventory")
          .delete()
          .eq("restaurant_id", RESTAURANT_ID)
          .eq("date", d);

        const rows = shifts.flatMap((shift) =>
          shift.tables.map((t) => ({
            restaurant_id: RESTAURANT_ID,
            date: d,
            start_time: shift.start_time,
            end_time: shift.end_time,
            capacity: t.capacity,
            quantity: t.quantity,
          }))
        );

        await supabase
          .from("restaurant_table_inventory")
          .insert(rows);
      }

      alert("✅ Copiado a toda la semana");

    } catch (e) {
      alert("Error al copiar");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración del restaurante</h1>

      {/* 🔹 CONFIGURACIÓN */}
      <div className="bg-white rounded-xl shadow p-6 space-y-6">

        {/* Fecha */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />

        {/* Turnos */}
        <div className="flex gap-2 flex-wrap">
          {shifts.map((shift, index) => (
            <button
              key={index}
              onClick={() => setSelectedShiftIndex(index)}
              className={`px-4 py-2 rounded ${
                selectedShiftIndex === index
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {shift.name}
            </button>
          ))}

          <button
            onClick={() => {
              const newShift = {
                name: "12:00 - 14:00",
                start_time: "12:00",
                end_time: "14:00",
                tables: [
                  { capacity: 2, quantity: 0 },
                  { capacity: 4, quantity: 0 },
                  { capacity: 6, quantity: 0 }
                ]
              };

              setShifts([...shifts, newShift]);
              setSelectedShiftIndex(shifts.length);
            }}
            className="px-4 py-2 rounded bg-green-600 text-white"
          >
            ➕ Agregar turno
          </button>
        </div>

        {/* Editor */}
        {currentShift && (
          <div className="space-y-4">

            {/* Horarios */}
            <div className="flex gap-2">
              <input
                type="time"
                value={currentShift.start_time}
                onChange={(e) => {
                  const updated = [...shifts];
                  updated[selectedShiftIndex].start_time = e.target.value;
                  updated[selectedShiftIndex].name =
                    `${e.target.value} - ${updated[selectedShiftIndex].end_time}`;
                  setShifts(updated);
                }}
                className="border p-2 rounded"
              />

              <input
                type="time"
                value={currentShift.end_time}
                onChange={(e) => {
                  const updated = [...shifts];
                  updated[selectedShiftIndex].end_time = e.target.value;
                  updated[selectedShiftIndex].name =
                    `${updated[selectedShiftIndex].start_time} - ${e.target.value}`;
                  setShifts(updated);
                }}
                className="border p-2 rounded"
              />
            </div>

            <h3 className="font-semibold text-lg">
              Turno {currentShift.name}
            </h3>

            {/* Eliminar */}
            <button
              onClick={() => {
                const updated = shifts.filter((_, i) => i !== selectedShiftIndex);
                setShifts(updated);
                setSelectedShiftIndex(
                  updated.length === 0 ? 0 : Math.max(0, selectedShiftIndex - 1)
                );
              }}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              🗑 Eliminar turno
            </button>

            {/* Mesas */}
            {currentShift.tables.map((table, i) => (
              <div
                key={i}
                className="flex justify-between items-center border p-4 rounded-lg bg-gray-50"
              >
                <span>Mesas para {table.capacity} personas</span>

                <input
                  type="number"
                  value={table.quantity}
                  onChange={(e) => {
                    const updated = [...shifts];
                    updated[selectedShiftIndex].tables[i].quantity = Number(e.target.value);
                    setShifts(updated);
                  }}
                  className="border p-2 w-24 rounded text-center"
                />
              </div>
            ))}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={saveShifts}
            className="bg-indigo-600 text-white px-6 py-2 rounded"
          >
            Guardar configuración
          </button>

          <button
            onClick={copyToWeek}
            className="bg-green-600 text-white px-6 py-2 rounded"
          >
            Copiar a toda la semana
          </button>
        </div>
      </div>

      {/* 🔹 VISTA ACTUAL */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-4">Vista actual</h2>

        {shifts.map((shift, i) => (
          <div key={i} className="mb-3 border-b pb-2">
            <div className="font-semibold">{shift.name}</div>

            {shift.tables.map((t, j) => (
              <div key={j} className="text-sm">
                {t.quantity} mesas de {t.capacity}
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}