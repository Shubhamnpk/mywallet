import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

export async function GET() {
  const APIS = [
    "https://shubhamnpk.github.io/yonepse/data/nepse_data.json" // Primary: User's personal scraper
  ]

  let lastError = "Data sources returned empty or invalid data"

  for (const url of APIS) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 300 }, // Cache for 5 mins instead of 1 hour for better accuracy
        signal: AbortSignal.timeout(8000), // Increase to 8s
      })

      if (response.ok) {
        const data = await response.json()
        // Handle different response formats (some APIs return { data: [...] })
        const prices = Array.isArray(data) ? data : (data.data || data.prices || [])

        if (Array.isArray(prices) && prices.length > 0) {
          return NextResponse.json(prices)
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
    message: `Nepal Stock Exchange data is currently unreachable. ${lastError}`,
  })
}
