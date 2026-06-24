import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

export async function GET() {
  const URL = "https://shubhamnpk.github.io/yonepse/data/other/brokers.json"

  try {
    const response = await fetch(URL, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch broker data",
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Network error fetching broker data",
    })
  }
}
