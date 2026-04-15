import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {

  const host = req.headers.get("host") || "";

  // 🔥 limpiar puerto (localhost:3000)
  const hostname = host.split(":")[0];

  const parts = hostname.split(".");

  // 👉 dominio base
  const isMainDomain =
    hostname === "turiago.app" ||
    hostname === "www.turiago.app" ||
    hostname.includes("localhost");

  if (isMainDomain) {
    return NextResponse.next();
  }

  // 👉 subdominio real
  if (parts.length >= 3) {
    const subdomain = parts[0];

    return NextResponse.rewrite(
      new URL(`/turnero/${subdomain}`, req.url)
    );
  }

  return NextResponse.next();
}