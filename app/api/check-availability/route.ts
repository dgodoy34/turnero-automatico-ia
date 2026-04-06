import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRestaurantId } from "@/lib/getRestaurantId";

export async function POST(req: Request) {

try {

// obtener restaurant automáticamente desde el middleware
const restaurant_id = await getRestaurantId(
  process.env.WHATSAPP_PHONE_NUMBER_ID!
);

const { date, time, people } = await req.json();


// 1️⃣ obtener inventario de mesas

const { data: tables } = await supabase
.from("restaurant_table_inventory")
.select("capacity,quantity")
.eq("business_id", restaurant_id);


// 2️⃣ obtener reservas del día

const { data: appointments } = await supabase
.from("appointments")
.select("assigned_table_capacity,tables_used,start_time,end_time")
.eq("business_id", restaurant_id)
.eq("date", date)
.eq("status", "confirmed");


// 3️⃣ determinar capacidad necesaria

let neededCapacity = 2;

if (people <= 2) neededCapacity = 2;
else if (people <= 4) neededCapacity = 4;
else neededCapacity = 6;


// 4️⃣ buscar tipo de mesa

const tableType = tables?.find(t => t.capacity === neededCapacity);

if (!tableType) {

return NextResponse.json({
available: false
});

}

const totalTables = tableType.quantity;


// 5️⃣ calcular mesas ocupadas

let used = 0;

appointments?.forEach(a => {

if (a.assigned_table_capacity !== neededCapacity) return;

used += a.tables_used || 1;

});


// 6️⃣ calcular disponibilidad

const freeTables = totalTables - used;


return NextResponse.json({

available: freeTables > 0,
free_tables: freeTables

});

} catch (error) {

console.error("check-availability error:", error);

return NextResponse.json(
{ error: "Internal server error" },
{ status: 500 }
);

}

}
