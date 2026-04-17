import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

export async function GET() {
  const APIS = [
    "https://shubhamnpk.github.io/yonepse/data/upcoming_ipo.json"
  ]

  let lastError = "Data sources returned empty or invalid data"

  for (const url of APIS) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 3600 }, // Cache for 1 hour as IPO data doesn't change frequently
        signal: AbortSignal.timeout(8000),
      })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          return NextResponse.json(data)
        }
      } else {
        lastError = `Source ${url} returned ${response.status}`
      }
    } catch {
      lastError = `Connection timeout or network error on ${url}`
    }
  }

  return errorResponse({
    status: 503,
    code: "UPSTREAM_UNREACHABLE",
    message: `Upcoming IPO data is currently unreachable. ${lastError}`,
  })
}
