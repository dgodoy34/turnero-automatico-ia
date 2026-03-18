import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {

  const url = req.nextUrl.clone();
  const host = req.headers.get("host") || "";

  // ejemplo: cliente1.turiact.com.ar
  const parts = host.split(".");

  // si no hay subdominio → salir
  if (parts.length < 3) {
    return NextResponse.next();
  }

  const subdomain = parts[0];

  // evitar admin o www
  if (subdomain === "www" || subdomain === "turiact") {
    return NextResponse.next();
  }

  // reescribir a /r/[slug]
  url.pathname = `/r/${subdomain}${url.pathname}`;

  return NextResponse.rewrite(url);

}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};