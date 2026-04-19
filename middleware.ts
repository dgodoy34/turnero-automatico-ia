import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {

  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  const pathname = req.nextUrl.pathname;

  const session = req.cookies.get("session")?.value;

  // =========================
  // 🔐 ADMIN (PRIORIDAD TOTAL)
  // =========================
  if (hostname === "admin.turiago.app") {

    // proteger rutas admin
    if (
      pathname.startsWith("/admin") &&
      !session
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // 🚫 NO TOCAR NADA EN ADMIN
    return NextResponse.next();
  }

  // =========================
  // 🌐 MAIN DOMAIN
  // =========================
  if (
    hostname === "turiago.app" ||
    hostname === "www.turiago.app"
  ) {
    return NextResponse.next();
  }

  // =========================
  // 🌍 SUBDOMINIOS → RESTAURANTE
  // =========================
  if (parts.length >= 3) {

    const subdomain = parts[0];

    return NextResponse.rewrite(
      new URL(`/r/${subdomain}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};