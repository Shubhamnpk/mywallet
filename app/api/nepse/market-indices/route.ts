import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const URL = "https://shubhamnpk.github.io/yonepse/data/market/indices.json"

export async function GET() {
  try {
    const response = await fetch(URL, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch market indices",
      })
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: "Invalid market indices data format",
      })
    }

    return NextResponse.json(data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Market indices data is currently unreachable",
    })
  }
}
