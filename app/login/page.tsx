import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const { data: user } = await supabase
    .from("restaurant_users")
    .select("*")
    .eq("email", email)
    .single();

  if (!user) {
    return NextResponse.json({ success: false });
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return NextResponse.json({ success: false });
  }

  const cookieStore = await cookies();

  cookieStore.set(
    "session",
    JSON.stringify({
      user_id: user.id,
      restaurant_id: user.restaurant_id,
      role: user.role,
    }),
    { path: "/" }
  );

  return NextResponse.json({
    success: true,
    role: user.role,
  });
}