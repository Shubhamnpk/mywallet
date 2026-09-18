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
  // yonepse moved: data/proposed_dividend/history_all_years.json -> data/dividend/history.json (columnar)
  const NEW_URL = "https://shubhamnpk.github.io/yonepse/data/dividend/history.json"
  const OLD_URL = "https://shubhamnpk.github.io/yonepse/data/proposed_dividend/history_all_years.json"

  for (const url of [NEW_URL, OLD_URL]) {
    try {
      const r = await fetch(url, { next: { revalidate: 60 * 60 * 6 }, signal: AbortSignal.timeout(10000) })
      if (!r.ok) continue
      const j = await r.json()
      // new columnar format
      if (j && Array.isArray(j.records) && Array.isArray(j.symbols)) {
        const { symbols, records } = j as { symbols: string[]; records: unknown[][] }
        const mapped: ProposedDividendRecord[] = records
          .map((rec, i) => {
            if (!Array.isArray(rec)) return null
            const sym = symbols[Number(rec[0])]
            if (!sym) return null
            return { id: i, symbol: sym, bonus_share: rec[1] as string, cash_dividend: rec[2] as string, total_dividend: rec[3] as string, announcement_date: rec[4] as string, bookclose_date: rec[5] as string, fiscal_year: rec[6] as string }
          })
          .filter(Boolean) as ProposedDividendRecord[]
        if (mapped.length > 0) return NextResponse.json(mapped)
        continue
      }
      if (Array.isArray(j) && j.length > 0) return NextResponse.json(j as ProposedDividendRecord[])
    } catch { /* try next */ }
  }

  return errorResponse({ status: 503, code: "UPSTREAM_UNREACHABLE", message: "Proposed dividend history is currently unreachable." })
}
