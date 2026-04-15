import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    console.log("EMAIL:", email);

    const { data: user, error } = await supabase
      .from("restaurant_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    console.log("USER:", user);
    console.log("ERROR:", error);

    if (!user || error) {
      console.log("❌ USER NOT FOUND");
      return NextResponse.json({ ok: false });
    }

    console.log("PASSWORD INGRESADA:", password);
    console.log("HASH DB:", user.password_hash);

    const isValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    console.log("VALID PASSWORD:", isValid);

    if (!isValid) {
      return NextResponse.json({ ok: false });
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set(
      "session",
      JSON.stringify({
        user_id: user.id,
        role: user.role,
        business_id: user.business_id,
      }),
      {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false, // 🔥 IMPORTANTE PARA TESTEAR
      }
    );

    return res;

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ ok: false });
  }
}