import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

type ProposedDividendRecord = {
  id: number
  symbol: string
  company_name: string
  company_url?: string
  bonus_share?: string
  cash_dividend?: string
  total_dividend?: string
  announcement_date?: string
  bookclose_date?: string
  distribution_date?: string | null
  bonus_listing_date?: string | null
  fiscal_year?: string
  ltp?: string
  price_as_of?: string
  status?: number
  scraped_at?: string
}

export async function GET() {
  const APIS = [
    "https://shubhamnpk.github.io/yonepse/data/proposed_dividend/history_all_years.json",
  ]

  let lastError = "Data source returned empty or invalid data"

  for (const url of APIS) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 60 * 60 * 6 },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        lastError = `Source ${url} returned ${response.status}`
        continue
      }

      const data: unknown = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data as ProposedDividendRecord[])
      }

      lastError = `Source ${url} returned empty data`
    } catch {
      lastError = `Connection timeout or network error on ${url}`
    }
  }

  return errorResponse({
    status: 503,
    code: "UPSTREAM_UNREACHABLE",
    message: `Proposed dividend history is currently unreachable. ${lastError}`,
  })
}
