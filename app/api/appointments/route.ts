import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const appointments = db
      .prepare(
        `
        SELECT 
          a.id,
          a.client_dni,
          a.date,
          a.time,
          a.service,
          a.notes,
          a.status,
          a.created_at
        FROM appointments a
        ORDER BY a.date DESC, a.time DESC
      `
      )
      .all();

    return NextResponse.json({ success: true, appointments });
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
    const { client_dni, date, time, service, notes } = body;

    if (!client_dni || !date || !time || !service) {
      return NextResponse.json(
        { success: false, error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    // Validamos que exista el cliente
    const client = db
      .prepare(`SELECT dni FROM clients WHERE dni = ?`)
      .get(client_dni);

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado (DNI inválido)" },
        { status: 404 }
      );
    }

    db.prepare(`
      INSERT INTO appointments (client_dni, date, time, service, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(client_dni, date, time, service, notes ?? null);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

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

    db.prepare(`UPDATE appointments SET status = ? WHERE id = ?`).run(
      status,
      id
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

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

    db.prepare(`DELETE FROM appointments WHERE id = ?`).run(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

