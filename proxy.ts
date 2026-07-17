import { NextResponse, type NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const { pathname } = request.nextUrl

  const isPdfProxy = pathname === "/api/proxy/pdf"

  if (!isPdfProxy) {
    const isDev = process.env.NODE_ENV === "development"
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "worker-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' *",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")

    response.headers.set("Content-Security-Policy", csp)
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
    response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)")
  } else {
    response.headers.set("X-Content-Type-Options", "nosniff")
  }

  return response
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icon-192.png|icon-512.png|icon-180.png|mywallet.png|workbox-|screenshot).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
