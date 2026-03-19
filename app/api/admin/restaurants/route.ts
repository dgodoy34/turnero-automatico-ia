import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

// =========================
// HELPERS
// =========================

function generateSlug(name: string) {
  return name
    ?.toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") || "resto";
}

function generateBranchCode(name: string) {
  const base = generateSlug(name);

  if (!base || base === "-") {
    return `branch-${Date.now()}`;
  }

  return `${base}-${Math.floor(Math.random() * 1000)}`;
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
          subscription_plans(name)
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

  // 🔥 lista
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
        subscription_plans(name)
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
    console.log("POST BODY:", body);

    const { name, address, owner_name, phone, email } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "Nombre requerido",
      });
    }

    const slug = generateSlug(name);

    let branch_code = generateBranchCode(name);

    // 🔥 blindaje total
    if (
      !branch_code ||
      branch_code.includes("undefined") ||
      branch_code.length < 3
    ) {
      branch_code = `branch-${Date.now()}`;
    }

    console.log("FINAL BRANCH_CODE:", branch_code);

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
      .select()
      .single();

    if (error) {
      console.error("INSERT ERROR:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      restaurant: data,
    });
  } catch (err: any) {
    console.error("POST ERROR:", err);
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
  try {
    const body = await req.json();
    console.log("PUT BODY:", body);

    const {
      id,
      name,
      slug: incomingSlug,
      address,
      owner_name,
      phone,
      email,
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID requerido",
      });
    }

    // 🔥 traemos el actual
    const { data: existing, error: fetchError } = await supabase
      .from("restaurants")
      .select("branch_code, slug")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("FETCH ERROR:", fetchError);
    }

    let branch_code = existing?.branch_code;

    // 🔥 si no existe → lo generamos SIEMPRE
    if (!branch_code) {
      branch_code = generateBranchCode(name || "resto");
      console.log("Generated missing branch_code:", branch_code);
    }

    const newSlug =
      incomingSlug || (name ? generateSlug(name) : existing?.slug);

    const updateData: any = {
      slug: newSlug,
      branch_code,
    };

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (owner_name !== undefined) updateData.owner_name = owner_name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const { error } = await supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    console.error("PUT ERROR:", err);
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
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