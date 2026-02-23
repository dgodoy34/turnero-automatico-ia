import { NextResponse } from "next/server";
import { generateReservationCode } from "@/lib/reservationCode";

export async function GET() {
  try {
    const code = await generateReservationCode("2026-03-15");

    return NextResponse.json({
      success: true,
      generatedCode: code
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}