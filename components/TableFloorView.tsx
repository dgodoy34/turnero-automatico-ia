"use client";

import { useEffect, useState } from "react";

type TableType = {
  capacity: number;
  quantity: number;
};

type Appointment = {
  assigned_table_capacity?: number;
  status: string;
};

type Props = {
  date: string;
  shift: string;
  businessId: string;
};

export default function TableFloorView({ date, shift, businessId }: Props) {
  const [tables, setTables] = useState<TableType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  async function loadData() {
    if (!businessId || !date) return;
    
    const [tablesRes, apptRes] = await Promise.all([
      fetch(`/api/table-inventory?date=${date}&shift=${shift}&business_id=${businessId}`),
      fetch(`/api/appointments?date=${date}&shift=${shift}&business_id=${businessId}`)
    ]);

  const tablesData = await tablesRes.json();
const apptData = await apptRes.json();

if (!tablesRes.ok || !tablesData.success) {
  console.error("❌ Inventory error:", tablesData);
  setTables([]);
} else {
  setTables(tablesData.tables || []);
}

if (!apptRes.ok || !apptData.success) {
  console.error("❌ Appointments error:", apptData);
  setAppointments([]);
} else {
  setAppointments(apptData.appointments || []);
}
  }
  useEffect(() => {
    loadData();
  }, [date, shift, businessId]);

  function getUsedCount(capacity: number) {
    return appointments.filter(a => 
      a.assigned_table_capacity === capacity && a.status === 'confirmed'
    ).length;
  }

  return (
    <div className="space-y-8 bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold">🗺️ Plano de Mesas (Vista Real)</h2>
      
      {[...tables]
        .sort((a, b) => a.capacity - b.capacity)
        .map(t => {
          const used = getUsedCount(t.capacity);
          const totalMesas = t.quantity + used; // Total de cuadros físicos

          return (
            <div key={t.capacity} className="border-b pb-6 last:border-0">
              <h3 className="font-semibold mb-3 text-gray-600">
                Sector: Mesas para {t.capacity === 6 ? "6+" : t.capacity} personas
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: totalMesas }).map((_, i) => {
                  const isOccupied = i < used;
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-4 text-center transition-all ${
                        isOccupied 
                          ? "bg-red-50 border-red-200 text-red-600" 
                          : "bg-green-50 border-green-200 text-green-600"
                      }`}
                    >
                      <span className="block text-sm font-bold">Mesa {t.capacity}</span>
                      <span className="text-[10px] uppercase font-extrabold">
                        {isOccupied ? "● Ocupada" : "○ Libre"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}