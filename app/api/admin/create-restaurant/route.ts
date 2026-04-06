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

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Nombre requerido" },
        { status: 400 }
      );
    }

    let slug = generateSlug(name);

    // evitar slug duplicado
    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      slug = slug + "-" + Date.now();
    }

    // =========================
    // 1️⃣ Crear RESTAURANT (TEMP = BUSINESS)
    // =========================

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        phone_number_id: null,
        whatsapp_number: body.whatsapp_number || null,
        max_capacity: 60,
        slot_duration_minutes: 90,
        capacity_mode: "strict"
      })
      .select()
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({
        success: false,
        error: restaurantError?.message || "Error creando negocio"
      });
    }

    const businessId = restaurant.id; // 🔥 NORMALIZACIÓN

    // =========================
    // 2️⃣ Crear usuario owner
    // =========================

    const passwordHash = await bcrypt.hash(password, 10);

    const { error: userError } = await supabase
      .from("restaurant_users")
      .insert({
        business_id: businessId,
        email,
        password_hash: passwordHash,
        role: "owner"
      });

    if (userError) {
      console.error("USER ERROR → rollback recomendado");
      return NextResponse.json({
        success: false,
        error: userError.message
      });
    }

    // =========================
    // 3️⃣ Crear settings iniciales
    // =========================

    const { error: settingsError } = await supabase
      .from("settings")
      .insert({
        business_id: businessId,
        open_time: "12:00",
        close_time: "23:00",
        slot_interval: 30,
        reservation_duration: 90,
        buffer_time: 15
      });

    if (settingsError) {
      console.error("SETTINGS ERROR → rollback recomendado");
    }

    // =========================
    // 4️⃣ Inventario mesas default
    // =========================

    const { error: inventoryError } = await supabase
      .from("restaurant_table_inventory")
      .insert([
        // DÍA
        {
          business_id: businessId,
          capacity: 2,
          quantity: 5,
          start_time: "12:00",
          end_time: "16:00"
        },
        {
          business_id: businessId,
          capacity: 4,
          quantity: 5,
          start_time: "12:00",
          end_time: "16:00"
        },
        {
          business_id: businessId,
          capacity: 6,
          quantity: 3,
          start_time: "12:00",
          end_time: "16:00"
        },

        // NOCHE
        {
          business_id: businessId,
          capacity: 2,
          quantity: 8,
          start_time: "19:00",
          end_time: "00:30"
        },
        {
          business_id: businessId,
          capacity: 4,
          quantity: 6,
          start_time: "19:00",
          end_time: "00:30"
        },
        {
          business_id: businessId,
          capacity: 6,
          quantity: 4,
          start_time: "19:00",
          end_time: "00:30"
        }
      ]);

    if (inventoryError) {
      console.error("INVENTORY ERROR → revisar");
    }

    // =========================
    // RESPUESTA
    // =========================

    return NextResponse.json({
      success: true,
      business_id: businessId,
      restaurant // ⚠️ legacy naming (ok por ahora)
    });

  } catch (err: any) {

    console.error("CREATE BUSINESS ERROR", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal error"
      },
      { status: 500 }
    );

  }

}