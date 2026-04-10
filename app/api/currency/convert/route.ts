import { NextRequest, NextResponse } from "next/server"
import { errorResponse, getRequestId } from "@/lib/api-error"

function badRequest(message: string) {
  return errorResponse({ status: 400, code: "BAD_REQUEST", message })
}

async function fetchFromFrankfurter(from: string, to: string) {
  const url = `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`
  const response = await fetch(url, { next: { revalidate: 300 } })
  if (!response.ok) return null

  const data = await response.json()
  const rate = typeof data?.rates?.[to] === "number" ? data.rates[to] : null
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null

  const date =
    typeof data?.date === "string"
      ? data.date
      : new Date().toISOString().slice(0, 10)

  return { rate, date, provider: "frankfurter.dev" as const }
}

async function fetchFromOpenErApi(from: string, to: string) {
  const url = `https://open.er-api.com/v6/latest/${from}`
  const response = await fetch(url, { next: { revalidate: 300 } })
  if (!response.ok) return null

  const data = await response.json()
  if (data?.result !== "success") return null

  const rate = typeof data?.rates?.[to] === "number" ? data.rates[to] : null
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null

  let date = new Date().toISOString().slice(0, 10)
  if (typeof data?.time_last_update_utc === "string") {
    const parsed = new Date(data.time_last_update_utc)
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed.toISOString().slice(0, 10)
    }
  }

  return { rate, date, provider: "open.er-api.com" as const }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const { searchParams } = new URL(request.url)
  const from = (searchParams.get("from") || "").trim().toUpperCase()
  const to = (searchParams.get("to") || "").trim().toUpperCase()

  if (!from || !to) return badRequest("Missing required query params: from, to")
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return badRequest("Currency codes must be 3 uppercase letters, e.g. USD, NPR")
  }

  if (from === to) {
    return NextResponse.json({
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      provider: "frankfurter.dev",
    })
  }

  try {
    const primary = await fetchFromFrankfurter(from, to)
    if (primary) {
      return NextResponse.json(primary)
    }

    const fallback = await fetchFromOpenErApi(from, to)
    if (fallback) {
      return NextResponse.json(fallback)
    }
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_ERROR",
          message: "No conversion rate found for this pair from available providers.",
          requestId,
        },
      },
      { status: 502 }
    )
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Currency providers are currently unreachable.",
      requestId,
    })
  }
}
