import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const URL = "https://shubhamnpk.github.io/yonepse/data/dividend/history.json"

type Raw = { symbols: string[]; columns: string[]; records: unknown[][] }

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "").trim().toUpperCase()

  try {
    const r = await fetch(URL, { next: { revalidate: 60 * 60 * 6 }, signal: AbortSignal.timeout(10000) })
    if (!r.ok) return errorResponse({ status: r.status, code: "UPSTREAM_ERROR", message: `Dividend history ${r.status}` })
    const data = (await r.json()) as Raw
    if (!Array.isArray(data.records) || !Array.isArray(data.symbols)) return errorResponse({ status: 502, code: "UPSTREAM_ERROR", message: "Invalid dividend format" })

    const { symbols, records } = data
    // columns: [symbolIndex, bonus, cash, total, announce, bookclose, fiscalYear]
    const expand = (rec: unknown[]) => {
      if (!Array.isArray(rec)) return null
      const idx = Number(rec[0])
      const sym = symbols[idx]
      if (!sym) return null
      return { symbol: sym, bonus: rec[1] ?? null, cash: rec[2] ?? null, total: rec[3] ?? null, announce: rec[4] ?? null, bookclose: rec[5] ?? null, fiscalYear: rec[6] ?? null }
    }

    let list = records.map(expand).filter(Boolean) as ReturnType<typeof expand>[]
    if (symbol) list = list.filter((x) => x!.symbol.toUpperCase() === symbol)

    return NextResponse.json({ count: list.length, symbols: symbols.length, records: list, scraped_at: (data as unknown as { scraped_at?: string }).scraped_at })
  } catch (e) {
    return errorResponse({ status: 503, code: "UPSTREAM_UNREACHABLE", message: `Dividend history unreachable. ${e instanceof Error ? e.message : ""}` })
  }
}
