import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
}

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const name = body.name;
    const email = body.email || `admin@${name}.com`;
    const password = body.password || "123456";

    if(!name){
      return NextResponse.json(
        { success:false, error:"Nombre requerido" },
        { status:400 }
      );
    }

    let slug = generateSlug(name);

    // evitar slug duplicado
    const { data:existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug",slug)
      .maybeSingle();

    if(existing){
      slug = slug + "-" + Date.now();
    }

    // =========================
    // 1️⃣ Crear restaurante
    // =========================

    const { data:restaurant, error:restaurantError } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
        max_capacity:60,
        slot_duration_minutes:90,
        capacity_mode:"strict"
      })
      .select()
      .single();

    if(restaurantError){

      return NextResponse.json({
        success:false,
        error:restaurantError.message
      });

    }

    // =========================
    // 2️⃣ Crear usuario owner
    // =========================

    const passwordHash = await bcrypt.hash(password,10);

    const { error:userError } = await supabase
      .from("restaurant_users")
      .insert({
        restaurant_id: restaurant.id,
        email,
        password_hash: passwordHash,
        role:"owner"
      });

    if(userError){

      return NextResponse.json({
        success:false,
        error:userError.message
      });

    }

    // =========================
    // 3️⃣ Crear settings iniciales
    // =========================

    await supabase
      .from("settings")
      .insert({
        restaurant_id: restaurant.id,
        open_time:"12:00",
        close_time:"23:00",
        slot_interval:30,
        reservation_duration:90,
        buffer_time:15
      });

    // =========================
    // 4️⃣ Inventario mesas default
    // =========================

    await supabase
      .from("restaurant_table_inventory")
      .insert([
        {
          restaurant_id:restaurant.id,
          capacity:2,
          quantity:5
        },
        {
          restaurant_id:restaurant.id,
          capacity:4,
          quantity:5
        },
        {
          restaurant_id:restaurant.id,
          capacity:6,
          quantity:3
        }
      ]);

  

    // =========================
    // RESPUESTA
    // =========================

    return NextResponse.json({
      success:true,
      restaurant
    });

  }catch(err:any){

    console.error("CREATE RESTAURANT ERROR",err);

    return NextResponse.json(
      {
        success:false,
        error:err.message || "Internal error"
      },
      { status:500 }
    );

  }

}