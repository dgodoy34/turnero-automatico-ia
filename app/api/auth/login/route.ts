import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const { data: user } = await supabase
      .from("restaurant_users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json({
        success: false,
        error: "Password incorrecto",
      });
    }

    // 🔥 SESSION SIMPLE
    const res = NextResponse.json({
      success: true,
      business_id: user.business_id,
    });

    res.cookies.set("session", JSON.stringify({
      business_id: user.business_id,
      email: user.email,
    }));

    return res;

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}