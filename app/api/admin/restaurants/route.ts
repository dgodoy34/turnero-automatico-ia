import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

// =========================
// HELPERS
// =========================

function generateSlug(name: string): string {
  if (!name || typeof name !== "string") return "resto-sin-nombre";

  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") || "resto";
}

function generateBranchCode(name: string): string {
  const base = generateSlug(name);
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  
  let code = `${base}-${randomPart}`;

  // Blindaje final: nunca dejar algo inválido
  if (!code || code.length < 5 || code.includes("undefined")) {
    code = `branch-${Date.now().toString().slice(-8)}`;
  }

  return code;
}

// =========================
// GET (sin cambios relevantes)
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
// CREATE RESTAURANT (POST)
// =========================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[POST] BODY recibido:", body);

    const { name, address, owner_name, phone, email } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ success: false, error: "Nombre es requerido y debe ser texto válido" });
    }

    const slug = generateSlug(name);
    const branch_code = generateBranchCode(name);

    console.log("[POST] Generado → slug:", slug, "branch_code:", branch_code);

    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        name: name.trim(),
        slug,
        branch_code,
        address: address ?? null,
        owner_name: owner_name ?? null,
        phone: phone ?? null,
        email: email ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST] Supabase insert error:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    console.log("[POST] Creado OK → ID:", data.id, "branch_code:", data.branch_code);

    return NextResponse.json({ success: true, restaurant: data });
  } catch (err: any) {
    console.error("[POST] Excepción general:", err);
    return NextResponse.json({ success: false, error: err.message || "Error interno al crear restaurante" });
  }
}

// =========================
// UPDATE RESTAURANT (PUT) → FIX PRINCIPAL AQUÍ
// =========================

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log("[PUT] BODY recibido:", body);

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
      return NextResponse.json({ success: false, error: "ID es requerido para actualizar" });
    }

    // Traer el registro actual (para preservar y chequear branch_code)
    const { data: existing, error: fetchError } = await supabase
      .from("restaurants")
      .select("branch_code, slug, name")
      .eq("id", id)
      .maybeSingle();  // permite null si no existe

    if (fetchError) {
      console.error("[PUT] Error al buscar restaurante:", fetchError);
      return NextResponse.json({ success: false, error: fetchError.message });
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: "Restaurante no encontrado" });
    }

    let branch_code = existing.branch_code;

    // Si NO tiene branch_code → generarlo ahora (esto arregla los registros corruptos)
    if (!branch_code || branch_code.trim() === "") {
      const nameForCode = name ?? existing.name ?? "sin-nombre";
      branch_code = generateBranchCode(nameForCode);
      console.log("[PUT] branch_code faltante → generado:", branch_code);
    }

    const newSlug = incomingSlug ?? (name ? generateSlug(name) : existing.slug);

    // Armar solo los campos que queremos actualizar
    const updateData: Record<string, any> = {
      slug: newSlug,
      branch_code,  // siempre lo ponemos (ya sea el viejo o el nuevo generado)
    };

    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address || null;
    if (owner_name !== undefined) updateData.owner_name = owner_name || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email || null;

    console.log("[PUT] Datos a actualizar:", updateData);

    const { error } = await supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("[PUT] Supabase update error:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    console.log("[PUT] Actualización OK para ID:", id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT] Excepción general:", err);
    return NextResponse.json({ success: false, error: err.message || "Error interno al actualizar" });
  }
}

// =========================
// DELETE (sin cambios)
// =========================

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID requerido" });
  }

  const { error } = await supabase
    .from("restaurants")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true });
}