import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = url.hostname;
  const pathname = url.pathname;

  const session = req.cookies.get("session")?.value;

  // ==================== ADMIN ====================
  if (hostname === "admin.turiago.app") {
    
    // Si no hay sesión y quiere entrar a /admin → redirigir a login
    if (pathname.startsWith("/admin") && !session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Si entra a la raíz del admin → redirigir a /admin
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // 🔥 CLAVE: NO TOCAR NADA más en admin (ni /turnero, ni /dashboard, etc.)
    // Dejamos que Next.js sirva las rutas reales del admin normalmente
    return NextResponse.next();
  }

  // ==================== DEMO ====================
  if (hostname === "demo.turiago.app") {
    // Raíz del demo → mostramos la página principal de Turnero
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/turnero", req.url)); 
      // Cambia a "/demo" si preferís otra ruta interna
    }

    // Cualquier otra ruta en demo la dejamos pasar normalmente
    return NextResponse.next();
  }

  // ==================== DOMINIO PRINCIPAL ====================
  if (hostname === "turiago.app" || hostname === "www.turiago.app") {
    return NextResponse.next();
  }

  // ==================== OTROS SUBDOMINIOS (restaurantes) ====================
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0];

    // Evitamos reescribir admin y demo
    if (subdomain !== "admin" && subdomain !== "demo") {
      return NextResponse.rewrite(
        new URL(`/r/${subdomain}${pathname || ""}`, req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};