import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const URL = "https://shubhamnpk.github.io/yonepse/data/market_status.json"

export async function GET() {
  try {
    const response = await fetch(URL, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch market status",
      })
    }

    const data = await response.json()
    if (!data || typeof data !== "object") {
      return errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: "Invalid market status data format",
      })
    }

    return NextResponse.json(data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Market status data is currently unreachable",
    })
  }
}

