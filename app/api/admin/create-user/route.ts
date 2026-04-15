import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, password, role, business_id } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Faltan datos" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from("restaurant_users")
      .insert({
        email,
        password_hash,
        role: role || "owner",
        business_id: business_id || null,
      });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false });
  }
}