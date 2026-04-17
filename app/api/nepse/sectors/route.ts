import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

export async function GET() {
  const URL = "https://shubhamnpk.github.io/yonepse/data/nepse_sector_wise_codes.json"

  try {
    const response = await fetch(URL, {
      next: { revalidate: 86400 }, // Cache for 24 hours as sectors don't change often
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch sector data",
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Network error fetching sector data",
    })
  }
}
