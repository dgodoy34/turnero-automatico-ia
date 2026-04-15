import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

// =========================
// 🔥 SLUG LIMPIO PRO
// =========================
function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // 🔥 evitar duplicados PRO
    while (true) {
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // =========================
    // 1️⃣ RESTAURANT
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
        capacity_mode: "strict",
      })
      .select()
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({
        success: false,
        error: restaurantError?.message || "Error creando negocio",
      });
    }

    const businessId = restaurant.id;

    // =========================
    // 2️⃣ USER OWNER
    // =========================
    const passwordHash = await bcrypt.hash(password, 10);

    const { error: userError } = await supabase
      .from("restaurant_users")
      .insert({
        business_id: businessId,
        email,
        password_hash: passwordHash,
        role: "owner",
      });

    if (userError) {
      return NextResponse.json({
        success: false,
        error: userError.message,
      });
    }

    // =========================
    // 3️⃣ SETTINGS
    // =========================
    await supabase.from("settings").insert({
      business_id: businessId,
      open_time: "12:00",
      close_time: "23:00",
      slot_interval: 30,
      reservation_duration: 90,
      buffer_time: 15,
    });

    // =========================
    // 4️⃣ INVENTARIO
    // =========================
    await supabase.from("restaurant_table_inventory").insert([
      { business_id: businessId, capacity: 2, quantity: 5, start_time: "12:00", end_time: "16:00" },
      { business_id: businessId, capacity: 4, quantity: 5, start_time: "12:00", end_time: "16:00" },
      { business_id: businessId, capacity: 6, quantity: 3, start_time: "12:00", end_time: "16:00" },
      { business_id: businessId, capacity: 2, quantity: 8, start_time: "19:00", end_time: "00:30" },
      { business_id: businessId, capacity: 4, quantity: 6, start_time: "19:00", end_time: "00:30" },
      { business_id: businessId, capacity: 6, quantity: 4, start_time: "19:00", end_time: "00:30" },
    ]);

    // =========================
    // RESPONSE
    // =========================
    return NextResponse.json({
      success: true,
      business_id: businessId,
      slug,
      url: `/turnero/${slug}`,
    });

  } catch (err: any) {
    console.error("CREATE BUSINESS ERROR", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal error",
      },
      { status: 500 }
    );
  }
}