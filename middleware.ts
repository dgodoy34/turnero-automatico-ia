import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {

  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  const session = req.cookies.get("session")?.value;

  const pathname = req.nextUrl.pathname;

  // =========================
  // 🔐 ADMIN DOMAIN (PRIORIDAD TOTAL)
  // =========================

  if (hostname === "admin.turiago.app") {

    // proteger rutas
    if (
      pathname.startsWith("/admin") &&
      !session
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next(); // 🚀 NO REWRITE
  }

  // =========================
  // 🌐 DOMINIO PRINCIPAL
  // =========================

  if (
    hostname === "turiago.app" ||
    hostname === "www.turiago.app"
  ) {
    return NextResponse.next();
  }

  // =========================
  // 🌍 SUBDOMINIOS (EXCEPTO ADMIN)
  // =========================

  if (parts.length >= 3) {

    const subdomain = parts[0];

    // 🚫 ignorar admin por seguridad extra
    if (subdomain === "admin") {
      return NextResponse.next();
    }

    return NextResponse.rewrite(
      new URL(`/r/${subdomain}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};