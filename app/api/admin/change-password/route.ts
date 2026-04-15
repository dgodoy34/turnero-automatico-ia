import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { user_id, new_password } = await req.json();

    const password_hash = await bcrypt.hash(new_password, 10);

    const { error } = await supabase
      .from("restaurant_users")
      .update({ password_hash })
      .eq("id", user_id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false });
  }
}