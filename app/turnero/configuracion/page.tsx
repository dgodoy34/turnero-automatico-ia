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

  const [selectedShift, setSelectedShift] = useState<"Día" | "Noche">("Día");

  const [shifts, setShifts] = useState<Shift[]>([
    {
      name: "Día",
      start_time: "12:00",
      end_time: "16:00",
      tables: [
        { capacity: 2, quantity: 6 },
        { capacity: 4, quantity: 2 },
        { capacity: 6, quantity: 1 }
      ]
    },
    {
      name: "Noche",
      start_time: "20:00",
      end_time: "23:30",
      tables: [
        { capacity: 2, quantity: 6 },
        { capacity: 4, quantity: 2 },
        { capacity: 6, quantity: 1 }
      ]
    }
  ]);

  const [savedShifts, setSavedShifts] = useState<Shift[]>([]);

  const currentShift = shifts.find(s => s.name === selectedShift);

  // 🔹 cargar desde DB
  async function loadShifts() {
    try {
      const { data } = await supabase
        .from("restaurant_table_inventory")
        .select("*")
        .eq("restaurant_id", RESTAURANT_ID);

      if (!data || data.length === 0) return;

      const grouped: any = {};

      data.forEach((row: any) => {
        const key = `${row.start_time}-${row.end_time}`;

        if (!grouped[key]) {
          grouped[key] = {
            name: row.start_time <= "16:00" ? "Día" : "Noche",
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

      const finalShifts: Shift[] = [
  result.find(s => s.name === "Día") || shifts.find(s => s.name === "Día")!,
  result.find(s => s.name === "Noche") || shifts.find(s => s.name === "Noche")!
];

setShifts(finalShifts);
setSavedShifts(finalShifts);
    } catch (e) {
      console.error(e);
    }
  }

  // 🔹 guardar
  async function saveShifts() {
    try {
      await supabase
        .from("restaurant_table_inventory")
        .delete()
        .eq("restaurant_id", RESTAURANT_ID);

      const rows: any[] = [];

      shifts.forEach(shift => {
        shift.tables.forEach(t => {
          rows.push({
            restaurant_id: RESTAURANT_ID,
            date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            capacity: t.capacity,
            quantity: t.quantity
          });
        });
      });

      await supabase.from("restaurant_table_inventory").insert(rows);

      alert("Configuración guardada 🚀");

      loadShifts();
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    }
  }

  useEffect(() => {
    loadShifts();
  }, []);

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

      {/* Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedShift("Día")}
          className={`px-4 py-2 rounded ${
            selectedShift === "Día"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Día
        </button>

        <button
          onClick={() => setSelectedShift("Noche")}
          className={`px-4 py-2 rounded ${
            selectedShift === "Noche"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Noche
        </button>
      </div>

      {/* Editor */}
      {currentShift && (
        <div className="space-y-3 mt-4">
          <h3 className="font-semibold text-lg">
            Configuración {selectedShift}
          </h3>

          {currentShift.tables.map((table, i) => (
            <div
              key={i}
              className="flex justify-between items-center border p-4 rounded-lg bg-gray-50"
            >
              <span className="font-medium">
                Mesa {table.capacity} personas
              </span>

              <input
                type="number"
                value={table.quantity}
                onChange={(e) => {
                  const updated = [...shifts];
                  const idx = shifts.findIndex(
                    (s) => s.name === selectedShift
                  );
                  updated[idx].tables[i].quantity = Number(e.target.value);
                  setShifts(updated);
                }}
                className="border p-2 w-24 rounded text-center"
              />
            </div>
          ))}
        </div>
      )}

      {/* Botón */}
      <button
        onClick={saveShifts}
        className="bg-indigo-600 text-white px-6 py-2 rounded"
      >
        Guardar configuración
      </button>
    </div>

    {/* 🔹 RESULTADO */}
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      <h2 className="text-xl font-semibold border-b pb-2">
        Configuración actual
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {shifts.map((shift, i) => (
          <div
            key={i}
            className="border rounded-xl p-4 bg-gray-50 shadow-sm"
          >
            <h3 className="font-semibold text-lg mb-4">
              {shift.name}
            </h3>

            <div className="space-y-2">
              {shift.tables.map((t, j) => (
                <div
                  key={j}
                  className="flex justify-between border-b pb-1 text-sm"
                >
                  <span>Mesa {t.capacity} personas</span>
                  <span className="font-semibold">{t.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);}