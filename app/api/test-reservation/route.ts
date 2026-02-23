import { NextResponse } from "next/server";
import { createReservation } from "../../../lib/createReservation";

export async function GET() {
  try {
    const result = await createReservation({
      dni: "12345678",
      date: "2026-03-15",
      time: "20:00",
      people: 2,
      notes: "Mesa en terraza"
    });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}