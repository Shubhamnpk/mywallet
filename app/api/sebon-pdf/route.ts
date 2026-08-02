import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const ALLOWED_HOSTS = new Set(["www.sebon.gov.np", "sebon.gov.np"])

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")
  if (!rawUrl) {
    return errorResponse({ status: 400, code: "BAD_REQUEST", message: "Missing url" })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return errorResponse({ status: 400, code: "BAD_REQUEST", message: "Invalid url" })
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return errorResponse({ status: 400, code: "BAD_REQUEST", message: "Host not allowed" })
  }

  try {
    const response = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: `Failed to fetch PDF (${response.status})`,
      })
    }

    const arrayBuffer = await response.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "SEBON PDF service is currently unreachable",
    })
  }
}
