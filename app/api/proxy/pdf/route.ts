import { NextResponse } from "next/server"
import http from "node:http"
import https from "node:https"
import { Readable } from "node:stream"

export const runtime = "nodejs"

const ALLOWED_PROTOCOL = /^https?:\/\//i
const INSECURE_TLS_HOSTS = new Set(["www.nepalstock.com.np", "nepalstock.com.np"])
const MAX_REDIRECTS = 3

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl || !ALLOWED_PROTOCOL.test(targetUrl)) {
    return NextResponse.json({ error: "Invalid or missing url parameter" }, { status: 400 })
  }

  const range = request.headers.get("range") || undefined

  const upstream = await fetchWithRedirect(targetUrl, range, 0)

  if (!upstream || (!upstream.ok && upstream.status !== 206)) {
    const status = upstream?.status ?? 502
    return NextResponse.json(
      { error: "Failed to fetch PDF from source", status },
      { status },
    )
  }

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
): Promise<ProxyResponse | null> => {
  if (depth > MAX_REDIRECTS) return null
  const target = new URL(url)
  const isHttps = target.protocol === "https:"
  const client = isHttps ? https : http

  const headers: Record<string, string> = {}
  if (range) headers["Range"] = range

  const useInsecureTls = isHttps && INSECURE_TLS_HOSTS.has(target.hostname)

  const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const req = client.request(
      {
        method: "GET",
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers,
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
      const nextUrl = new URL(location, target).toString()
      return fetchWithRedirect(nextUrl, range, depth + 1)
    }
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: res.headers,
    body: Readable.toWeb(res) as ReadableStream<Uint8Array>,
  }
}
