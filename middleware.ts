import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") || "";
  const hostname = url.hostname; // Mejor que split manual
  // Alternativa más robusta para Vercel/Proxy:
  // const hostname = req.headers.get("x-forwarded-host") || url.hostname;

  const pathname = url.pathname;
  const session = req.cookies.get("session")?.value;

  console.log(`Middleware → Host: ${hostname} | Path: ${pathname}`); // Para debug

  // =========================
  // 🔐 ADMIN (PRIORIDAD MÁXIMA)
  // =========================
  if (hostname === "admin.turiago.app") {
    // Si intenta entrar a /admin sin sesión → redirigir a login
    if (pathname.startsWith("/admin") && !session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Si entra a la raíz del admin, redirigir a /admin (opcional)
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Todo lo demás del admin pasa sin tocar
    return NextResponse.next();
  }

  // =========================
  // 🌍 DEMO (caso especial)
  // =========================
  if (hostname === "demo.turiago.app") {
    // https://demo.turiago.app/  → lo que vos quieras (ej: /turnero o /demo-home)
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/turnero", req.url)); // Cambia "/demo" por la ruta real que querés
    }

    // https://demo.turiago.app/turnero → va a /turnero directamente
    if (pathname === "/turnero" || pathname.startsWith("/turnero/")) {
      return NextResponse.rewrite(new URL(pathname, req.url)); // o a otra ruta interna si hace falta
    }

    // Cualquier otra ruta en demo la dejamos pasar (o rewrite si querés)
    return NextResponse.next();
  }

  // =========================
  // 🌐 DOMINIO PRINCIPAL
  // =========================
  if (hostname === "turiago.app" || hostname === "www.turiago.app") {
    return NextResponse.next();
  }

  // =========================
  // 🌍 OTROS SUBDOMINIOS → RESTAURANTE (/r/xxx)
  // =========================
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0];

    // Evitamos reescribir admin y demo (ya los manejamos arriba)
    if (subdomain !== "admin" && subdomain !== "demo") {
      return NextResponse.rewrite(new URL(`/r/${subdomain}${pathname}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (imágenes, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};