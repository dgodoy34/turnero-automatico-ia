import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createReservation } from "@/lib/createReservation";
import { getRestaurantId } from "@/lib/getRestaurantId";

async function resolveBusinessId(req: Request) {

  // 🔥 1. intentar por header (modo SaaS)
  const headerBusinessId = req.headers.get("x-business-id");

  if (headerBusinessId) return headerBusinessId;

  // 🔥 2. fallback WhatsApp (modo bot)
  return await getRestaurantId(
    process.env.WHATSAPP_PHONE_NUMBER_ID!
  );
}

// ============================
// GET - Listar reservas
// ============================

export async function GET(req: Request) {

  try {

    const businessId = await resolveBusinessId(req);

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        reservation_code,
        client_dni,
        date,
        time,
        start_time,
        end_time,
        people,
        assigned_table_capacity,
        tables_used,
        notes,
        status,
        created_at,
        clients!appointments_client_dni_fkey (
          dni,
          name,
          phone,
          email
        )
      `)
      .eq("business_id", businessId)
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
// POST - Crear reserva
// ============================

export async function POST(req: Request) {

  try {

   const businessId = await resolveBusinessId(req);

const body = await req.json();

const { client_dni, date, time, people, source } = body;

if (!client_dni || !date || !time || !people) {
  return NextResponse.json(
    { success: false, error: "Faltan datos obligatorios" },
    { status: 400 }
  );
}

const result = await createReservation({
  business_id: businessId,
  dni: client_dni,
  date,
  time,
  people,
  source: source || "manual",
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

    const businessId = await resolveBusinessId(req);

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
      .eq("id", id)
      .eq("business_id", businessId);

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

    const businessId = await resolveBusinessId(req);

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
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err: any) {

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );

  }

}