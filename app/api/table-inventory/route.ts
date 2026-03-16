import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request){

const { searchParams } = new URL(req.url);
const date = searchParams.get("date");


// obtener restaurante

const { data:restaurant, error:restaurantError } = await supabase
.from("restaurants")
.select("id")
.limit(1)
.single();

if(restaurantError || !restaurant){
return NextResponse.json({
success:false,
error:"Restaurante no encontrado"
},{ status:400 });
}


// inventario base

const { data:baseTables } = await supabase
.from("restaurant_table_inventory")
.select("capacity,quantity")
.eq("restaurant_id", restaurant.id)
.order("capacity",{ ascending:true });


// override del día

let override:any[] = [];

if(date){

const { data } = await supabase
.from("restaurant_daily_table_override")
.select("capacity,quantity")
.eq("restaurant_id", restaurant.id)
.eq("date", date);

override = data || [];

}


// aplicar override

const tables = baseTables?.map(t => {

const o = override.find(x => x.capacity === t.capacity);

return {
capacity: t.capacity,
quantity: o ? o.quantity : t.quantity
};

});


return NextResponse.json({
success:true,
tables
});

}
