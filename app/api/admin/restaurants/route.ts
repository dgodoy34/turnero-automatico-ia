import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

// =========================
// HELPERS
// =========================

function generateSlug(name: string): string {
  if (!name || typeof name !== "string") return "resto-sin-nombre";

  return (
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "resto"
  );
}

function generateBranchCode(name: string) {
  const base = generateSlug(name) || "resto";

  let code = `${base}-${crypto.randomUUID()}`;

  if (
    !code ||
    code.length < 5 ||
    code.includes("undefined") ||
    code.includes("--")
  ) {
    code = `branch-${Date.now()}`;
  }

  return code;
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
        active,
        phone_number_id,
        whatsapp_number,
        restaurant_licenses(
          status,
          expires_at,
          subscription_plans(name)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, restaurant: data });
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
      whatsapp_number,
      restaurant_licenses(
        status,
        expires_at,
        subscription_plans(name)
      )
    `);

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, restaurants: data });
}

// =========================
// CREATE (POST)
// =========================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[POST] BODY:", body);

    const { name, address, owner_name, phone, email, whatsapp_number } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "Nombre requerido",
      });
    }

    const slug = generateSlug(name);

    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        name: name.trim(),
        slug,
        address: address || "",
        owner_name: owner_name || "",
        phone: phone || "",
        email: email || "",
        whatsapp_number: whatsapp_number || null, // 🔥
      })
      .select()
      .single();

    if (error) {
      console.error("[POST ERROR]:", error);
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
    console.error("[POST EXCEPTION]:", err);
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}

// =========================
// UPDATE (PUT)
// =========================

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log("[PUT] BODY:", body);

    const {
      id,
      name,
      slug: incomingSlug,
      address,
      owner_name,
      phone,
      email,
      whatsapp_number // 🔥 NUEVO
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID requerido",
      });
    }

    const { data: existing } = await supabase
      .from("restaurants")
      .select("branch_code, slug, name")
      .eq("id", id)
      .single();

    let branch_code = existing?.branch_code;

    if (!branch_code) {
      branch_code = generateBranchCode(name || existing?.name || "resto");
    }

    const newSlug =
      incomingSlug || (name ? generateSlug(name) : existing?.slug);

    const updateData: any = {
      slug: newSlug,
      branch_code,
    };

    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address || "";
    if (owner_name !== undefined) updateData.owner_name = owner_name || "";
    if (phone !== undefined) updateData.phone = phone || "";
    if (email !== undefined) updateData.email = email || "";

    // 🔥 ESTE ES EL FIX CLAVE
    if (whatsapp_number !== undefined) {
      updateData.whatsapp_number = whatsapp_number || null;
    }

    const { error } = await supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("[PUT ERROR]:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT EXCEPTION]:", err);
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

  return NextResponse.json({ success: true });
}