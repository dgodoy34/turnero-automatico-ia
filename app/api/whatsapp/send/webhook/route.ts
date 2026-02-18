import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "turnero_verify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📩 WhatsApp webhook recibido:", JSON.stringify(body, null, 2));

    // IMPORTANTE: responder 200 rápido
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error webhook:", err.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
