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
  shift: "Día" | "Noche";
};

export default function TableFloorView({
  appointments = [],
  date,
  shift,
}: Props) {
  const [tables, setTables] = useState<TableType[]>([]);

  async function loadTables() {
    if (!date) return;

    try {
      const restaurantId = "f9661b52-312d-46f6-9615-89aecfbb8a09";

      const res = await fetch(
        `/api/table-inventory?date=${date}&shift=${shift}&restaurant_id=${restaurantId}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Fetch falló");

      const data = await res.json();
      console.log("✅ Mesas desde API:", data.tables);

      setTables(data.tables || []);
    } catch (err) {
      console.error("❌ Error cargando mesas:", err);
      setTables([]);
    }
  }

  useEffect(() => {
    loadTables();
  }, [date, shift]);

  // 🔥 CLAVE: calcular mesas ocupadas
function usedTables(capacity: number) {
  let used = 0;

  appointments.forEach((a) => {
    if (a.date !== date) return;
    if (a.status !== "confirmed") return;
    if (!a.assigned_table_capacity) return;

    // 🔥 FILTRO POR TURNO
    const hour = a.start_time?.slice(0, 2); // "20:30" → "20"

    if (shift === "Día" && hour && Number(hour) >= 17) return;
    if (shift === "Noche" && hour && Number(hour) < 17) return;

    // 🔥 LÓGICA ORIGINAL
    if (a.assigned_table_capacity >= 6 && capacity === 6) {
      used += a.tables_used || 1;
    } else if (a.assigned_table_capacity === capacity) {
      used += a.tables_used || 1;
    }
  });

  return used;
}

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold mb-6 text-2xl">
        Plano de mesas ({shift})
      </h2>

      {tables.length === 0 ? (
        <div className="p-8 text-center text-amber-600 border border-amber-200 rounded-lg">
          Sin mesas para este turno
        </div>
      ) : (
        <div className="space-y-6">
          {tables.map((t) => {
            const used = usedTables(t.capacity);

            return (
              <div key={t.capacity}>
                <h3 className="font-semibold mb-2">
                  {t.capacity === 6 ? "6+" : t.capacity} personas ({t.quantity})
                </h3>

                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {Array.from({ length: t.quantity }).map((_, idx) => {
                    const isUsed = idx < used;

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs text-center ${
                          isUsed
                            ? "bg-red-100 border-red-400"
                            : "bg-green-100 border-green-400"
                        }`}
                      >
                        <div className="font-semibold">Mesa</div>
                        <div>{t.capacity}</div>
                        <div
                          className={
                            isUsed ? "text-red-700" : "text-green-700"
                          }
                        >
                          {isUsed ? "Ocupada" : "Libre"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
  
