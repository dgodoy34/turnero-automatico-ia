import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(){

const { data,error } = await supabase
.from("restaurant_table_inventory")
.select("capacity,quantity")
.order("capacity",{ ascending:true });

if(error){
return NextResponse.json({ success:false });
}

return NextResponse.json({
success:true,
tables:data
});

}