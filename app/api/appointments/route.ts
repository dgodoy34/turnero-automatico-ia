import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createReservation } from "@/lib/createReservation";

// ============================
// GET - Listar reservas
// ============================
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      appointments: data ?? [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ============================
// POST - Crear reserva RESTAURANTE
// ============================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { client_dni, date, time, people } = body;

    if (!client_dni || !date || !time || !people) {
      return NextResponse.json(
        { success: false, error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    const result = await createReservation({
      dni: client_dni,
      date,
      time,
      people: Number(people),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ============================
// PUT - Cambiar estado
// ============================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Faltan datos (id/status)" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// ============================
// DELETE - Eliminar reserva
// ============================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
