import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const clients = db.prepare(`
      SELECT dni, name, phone, email, created_at
      FROM clients
      ORDER BY created_at DESC
    `).all();

    return NextResponse.json({ success: true, clients });
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
        { success: false, error: "dni, name y phone son obligatorios" },
        { status: 400 }
      );
    }

    const exists = db
      .prepare(`SELECT dni FROM clients WHERE dni = ?`)
      .get(dni);

    if (exists) {
      return NextResponse.json(
        { success: false, error: "Ese DNI ya existe" },
        { status: 409 }
      );
    }

    db.prepare(`
      INSERT INTO clients (dni, name, phone, email)
      VALUES (?, ?, ?, ?)
    `).run(dni, name, phone, email ?? null);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
