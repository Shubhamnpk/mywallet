import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

export async function GET() {
  const APIS = [
    "https://shubhamnpk.github.io/yonepse/data/ipo/old.json",
  ]

  let lastError = "Data sources returned empty or invalid data"

  for (const url of APIS) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 86400 }, // Archive data never changes; cache for a day
        signal: AbortSignal.timeout(8000),
      })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const archived = data.map((ipo) => ({ ...ipo, status: "closed" }))
          return NextResponse.json(archived)
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
    message: `IPO archive data is currently unreachable. ${lastError}`,
  })
}
