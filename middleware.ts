import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {

  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  const session = req.cookies.get("session")?.value;

  const isProtected =
    req.nextUrl.pathname.startsWith("/admin") ||
    req.nextUrl.pathname.startsWith("/panel");

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // =========================
  // 🔐 ADMIN DOMAIN
  // =========================

  if (hostname === "admin.turiago.app") {
    return NextResponse.next();
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
  // 🌍 SUBDOMINIOS → SLUG
  // =========================

  if (parts.length >= 3) {
    const subdomain = parts[0];
    const path = req.nextUrl.pathname;

    // 🔥 si entra con /turnero → limpiar
    if (path.startsWith("/turnero")) {
      return NextResponse.rewrite(
        new URL(`/r/${subdomain}`, req.url)
      );
    }

    // 🔥 cualquier otra ruta → mantenerla
    return NextResponse.rewrite(
      new URL(`/r/${subdomain}${path}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};