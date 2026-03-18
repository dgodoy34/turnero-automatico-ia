import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {

  const host = req.headers.get("host") || ""
  const url = req.nextUrl.clone()

  const parts = host.split(".")

  // ejemplo: cliente1.turiact.com.ar
  if (parts.length < 3) {
    return NextResponse.next()
  }

  const subdomain = parts[0]

  // ignorar admin o www
  if (subdomain === "www" || subdomain === "admin") {
    return NextResponse.next()
  }

  url.pathname = `/r/${subdomain}${url.pathname}`

  return NextResponse.rewrite(url)

}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}