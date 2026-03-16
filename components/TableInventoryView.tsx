"use client";

import { useEffect, useState } from "react";

type TableType = {
  capacity: number;
  quantity: number;
};

type Appointment = {
  assigned_table_capacity?: number;
  tables_used?: number;
  status: string;
  date: string;
};

type Props = {
  date: string;
};

export default function TableInventoryView({ date }: Props) {

  const [tables,setTables] = useState<TableType[]>([]);
  const [appointments,setAppointments] = useState<Appointment[]>([]);

  async function loadData(){

    const tablesRes = await fetch(`/api/table-inventory?date=${date}`);
    const tablesData = await tablesRes.json();

    const apptRes = await fetch("/api/appointments");
    const apptData = await apptRes.json();

    setTables(tablesData.tables || []);
    setAppointments(apptData.appointments || []);
  }

  useEffect(() => {

    if (!date) return;

    loadData();

  }, [date]);


  function usedTables(capacity:number){

    let used = 0;

    appointments.forEach(a => {

      if(a.date !== date) return;
      if(a.status !== "confirmed") return;
      if(!a.assigned_table_capacity) return;

      if(a.assigned_table_capacity >= 6 && capacity === 6){

        used += a.tables_used || 1;

      }

      else if(a.assigned_table_capacity === capacity){

        used += a.tables_used || 1;

      }

    });

    return used;

  }


  return(

<div className="bg-white rounded-xl shadow p-6">

<h2 className="font-semibold mb-4">
Inventario de mesas
</h2>

<div className="space-y-3">

{tables.map(t=>{

const used = usedTables(t.capacity);
const free = Math.max(0, t.quantity - used);

return(

<div
key={t.capacity}
className="flex justify-between items-center border p-3 rounded"
>

<div>
Mesa {t.capacity === 6 ? "6+" : t.capacity} personas
</div>

<div className="flex gap-3 text-sm">

<span className="text-gray-500">
Total: {t.quantity}
</span>

<span className="text-red-600">
Ocupadas: {used}
</span>

<span className="text-green-600">
Libres: {free}
</span>

</div>

</div>

);

})}

</div>

</div>

  );
}