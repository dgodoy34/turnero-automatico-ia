import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, clients: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dni, name, phone, email } = body;

    if (!dni || !name || !phone) {
      return NextResponse.json(
        { success: false, error: "Faltan datos obligatorios (dni/name/phone)" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("clients")
      .insert([
        {
          dni: String(dni),
          name: String(name),
          phone: String(phone),
          email: email ? String(email) : null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, client: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
