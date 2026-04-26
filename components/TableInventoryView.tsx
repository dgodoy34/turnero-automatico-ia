"use client";

import { useEffect, useState } from "react";

type TableType = {
  capacity: number;
  quantity: number; 
};

type Props = {
  date: string;
  shift: string;
  businessId: string;
};

export default function TableInventoryView({ date, shift, businessId }: Props) {
  // 1. Declaración correcta de los estados
  const [tables, setTables] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]); // Corregido: ya no dará error
  const [loading, setLoading] = useState(false);

  // 2. useEffect separado de la lógica de carga
  useEffect(() => {
    loadData();
  }, [businessId, date, shift]);

  // 3. Función loadData cerrada correctamente
  async function loadData() {
    if (!businessId || !date) return;
    setLoading(true);
    try {
      const tablesUrl = `/api/table-inventory?business_id=${encodeURIComponent(businessId)}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`;
      const apptUrl = `/api/appointments?business_id=${encodeURIComponent(businessId)}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`;

      const [tablesRes, apptRes] = await Promise.all([
        fetch(tablesUrl),
        fetch(apptUrl),
      ]);

      const tablesData = await tablesRes.json();
      const apptData = await apptRes.json();

      setTables(tablesData.tables || []);
      setAppointments(apptData.appointments || []); // Ahora sí existe
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  } // <--- AQUÍ se cierra loadData

  // 4. El RETURN ahora pertenece al componente principal
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        📊 Estado del Inventario
      </h2>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-500">Actualizando inventario...</p>
        ) : (
          tables
            .sort((a, b) => a.capacity - b.capacity)
            .map((t) => (
              <div
                key={t.capacity}
                className="flex justify-between items-center border p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-700">
                  Mesa {t.capacity === 6 ? "6+" : t.capacity} personas
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-green-400 text-[10px] uppercase font-bold">Disponibles</span>
                  <span className="text-green-600 text-xl font-bold">{t.quantity}</span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
} // <--- AQUÍ se cierra el componente TableInventoryView