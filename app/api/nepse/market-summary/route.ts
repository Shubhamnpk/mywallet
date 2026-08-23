import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const NEPSE_API = process.env.NEPSE_API_URL || "http://130.210.4.183:8000"

export async function GET() {
  try {
    const response = await fetch(`${NEPSE_API}/api/v1/market/summary`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch market summary",
      })
    }

    const result = await response.json()
    if (!result?.success || !Array.isArray(result.data)) {
      return errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: "Invalid market summary data format",
      })
    }

    return NextResponse.json(result.data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Market summary data is currently unreachable",
    })
  }
}
