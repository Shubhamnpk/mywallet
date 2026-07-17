import { NextResponse } from "next/server"
import http from "node:http"
import https from "node:https"
import { Readable } from "node:stream"

export const runtime = "nodejs"

const ALLOWED_DOMAINS = new Set([
  "www.nepalstock.com.np",
  "nepalstock.com.np",
  "merolagani.com",
  "www.merolagani.com",
  "shareholders.com.np",
  "www.shareholders.com.np",
])

const MAX_REDIRECTS = 3
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024

// RFC 1918 / private / loopback / link-local ranges
const PRIVATE_IPS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
]

const isPrivateIp = (hostname: string): boolean => {
  if (PRIVATE_IPS.some((re) => re.test(hostname))) return true
  try {
    return hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(targetUrl)
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (!ALLOWED_DOMAINS.has(target.hostname)) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 })
  }

  if (isPrivateIp(target.hostname)) {
    return NextResponse.json({ error: "Internal addresses are not allowed" }, { status: 403 })
  }

  const range = request.headers.get("range") || undefined
  const upstream = await fetchWithRedirect(target.toString(), range, 0)

  if (!upstream || (!upstream.ok && upstream.status !== 206)) {
    const status = upstream?.status ?? 502
    return NextResponse.json(
      { error: "Failed to fetch PDF from source", status },
      { status },
    )
  }

  const contentType = upstream.headers["content-type"]

  const headers = new Headers()
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "accept-ranges",
    "content-range",
    "etag",
    "last-modified",
  ]

  passthroughHeaders.forEach((key) => {
    const value = upstream.headers[key]
    if (typeof value === "string") headers.set(key, value)
  })

  headers.set("cache-control", "no-store")

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}

type ProxyResponse = {
  ok: boolean
  status: number
  headers: Record<string, string | string[] | undefined>
  body: ReadableStream<Uint8Array>
}

const fetchWithRedirect = async (
  url: string,
  range?: string,
  depth: number = 0,
  accumulatedSize: number = 0,
): Promise<ProxyResponse | null> => {
  if (depth > MAX_REDIRECTS) return null
  if (accumulatedSize > MAX_RESPONSE_SIZE) return null

  const target = new URL(url)

  if (isPrivateIp(target.hostname)) return null

  const isHttps = target.protocol === "https:"
  const client = isHttps ? https : http

  const reqHeaders: Record<string, string> = {}
  if (range) reqHeaders["Range"] = range

  const useInsecureTls = isHttps && ALLOWED_DOMAINS.has(target.hostname)

  const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const req = client.request(
      {
        method: "GET",
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers: reqHeaders,
        ...(isHttps ? { rejectUnauthorized: !useInsecureTls } : {}),
      },
      resolve,
    )
    req.on("error", reject)
    req.end()
  })

  const status = res.statusCode || 502
  if ([301, 302, 303, 307, 308].includes(status)) {
    const location = res.headers.location
    if (location) {
      const nextUrl = new URL(location, target)
      if (!ALLOWED_DOMAINS.has(nextUrl.hostname)) return null
      if (isPrivateIp(nextUrl.hostname)) return null
      return fetchWithRedirect(nextUrl.toString(), range, depth + 1, accumulatedSize)
    }
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: res.headers,
    body: Readable.toWeb(res) as ReadableStream<Uint8Array>,
  }
}
