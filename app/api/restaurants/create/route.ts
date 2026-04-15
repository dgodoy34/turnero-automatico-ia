import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sacar acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // 🔥 evitar duplicados
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

    // 🔥 branch_code automático (001, 002, etc)
    const { count } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true });

    const branch_code = String((count || 0) + 1).padStart(3, "0");

    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        branch_code,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      restaurant: data,
      url: `/turnero/${slug}`,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error creando restaurante" }, { status: 500 });
  }
}