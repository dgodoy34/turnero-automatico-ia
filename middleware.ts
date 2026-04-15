import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {

  const host = req.headers.get("host") || "";

  // 🔥 limpiar puerto (localhost:3000)
  const hostname = host.split(":")[0];

  const parts = hostname.split(".");

  // =========================
  // 🔐 PROTEGER PANEL
  // =========================

  const isPanel = req.nextUrl.pathname.startsWith("/panel");

  const session = req.cookies.get("session")?.value;

  if (isPanel && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // =========================
  // 🌐 DOMINIO PRINCIPAL
  // =========================

  const isMainDomain =
    hostname === "turiago.app" ||
    hostname === "www.turiago.app" ||
    hostname === "admin.turiago.app" || // 🔥 IMPORTANTE
    hostname.includes("localhost");

  if (isMainDomain) {
    return NextResponse.next();
  }

  // =========================
  // 🌍 SUBDOMINIOS → SLUG
  // =========================

  if (parts.length >= 3) {
    const subdomain = parts[0];

    return NextResponse.rewrite(
      new URL(`/turnero/${subdomain}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};