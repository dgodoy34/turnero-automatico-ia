import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

// =========================
// HELPERS
// =========================

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function generateBranchCode(name: string) {
  const base = generateSlug(name) || "resto";
  return base + "-" + Math.floor(Math.random() * 1000);
}

// =========================
// GET
// =========================

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(`
        id,
        name,
        slug,
        branch_code,
        address,
        owner_name,
        phone,
        email,
        phone_number_id,
        restaurant_licenses(
          status,
          expires_at,
          subscription_plans(
            name
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      restaurant: data,
    });
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select(`
      id,
      name,
      slug,
      branch_code,
      address,
      owner_name,
      phone,
      email,
      phone_number_id,
      restaurant_licenses(
        status,
        expires_at,
        subscription_plans(
          name
        )
      )
    `);

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    success: true,
    restaurants: data,
  });
}

// =========================
// CREATE RESTAURANT
// =========================

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("BODY:", body);

    const { name, address, owner_name, phone, email } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "Nombre requerido",
      });
    }

    const slug = generateSlug(name);

    // 🔥 SIEMPRE asegura valor válido
    let branch_code = generateBranchCode(name);

    if (!branch_code || branch_code.includes("undefined")) {
      branch_code = `branch-${Date.now()}`;
    }

    console.log("BRANCH_CODE:", branch_code);

    const { data, error } = await supabase
      .from("restaurants")
      .insert([
        {
          name,
          slug,
          branch_code,
          address: address || "",
          owner_name: owner_name || "",
          phone: phone || "",
          email: email || "",
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      restaurant: data[0],
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}

// =========================
// UPDATE RESTAURANT
// =========================

export async function PUT(req: Request) {
  const body = await req.json();

  const {
    id,
    name,
    slug,
    address,
    owner_name,
    phone,
    email,
  } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "ID requerido" });
  }

  const newSlug = slug || generateSlug(name || "");

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      slug: newSlug,
      address: address || "",
      owner_name: owner_name || "",
      phone: phone || "",
      email: email || "",
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    success: true,
  });
}

// =========================
// DELETE
// =========================

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false });
  }

  const { error } = await supabase
    .from("restaurants")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    success: true,
  });
}