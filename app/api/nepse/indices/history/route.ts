import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const INDICES_BASE_URL = "https://shubhamnpk.github.io/yonepse/data/indices"
const DEFAULT_MONTH_LIMIT = 24
const MAX_MONTH_LIMIT = 120

type Manifest = { latestDate?: string; availableMonths?: string[] }
type MonthlyPayload = { dates?: string[]; series?: Record<string, unknown[]> }

const isMonthKey = (v: string) => /^\d{4}-\d{2}$/.test(v)
const asNum = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : undefined }

async function fetchJson<T>(path: string, reval: number): Promise<T> {
  const r = await fetch(`${INDICES_BASE_URL}${path}`, { next: { revalidate: reval }, signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`${path} ${r.status}`)
  return r.json() as Promise<T>
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const symbol = (p.get("symbol") || "NEPSE").trim().toUpperCase()
  const limit = Math.min(Math.max(Number(p.get("months") || DEFAULT_MONTH_LIMIT) || DEFAULT_MONTH_LIMIT, 1), MAX_MONTH_LIMIT)
  const month = p.get("month") || ""

  try {
    const manifest = await fetchJson<Manifest>("/manifest.json", 300)
    const allMonths = (manifest.availableMonths || []).filter(isMonthKey).sort()
    const months = isMonthKey(month) ? [month] : allMonths.slice(-limit)

    const payloads = await Promise.allSettled(months.map(async (m) => ({ m, payload: await fetchJson<MonthlyPayload>(`/monthly/${m}.json`, 300) })))

    const points = payloads.flatMap((res) => {
      if (res.status !== "fulfilled") return []
      const { payload } = res.value
      const rows = Array.isArray(payload.series?.[symbol]) ? payload.series[symbol] : []
      const dates = payload.dates || []
      return rows.map((row) => {
        if (!Array.isArray(row)) return null
        const date = dates[Number(row[0])]
        const close = asNum(row[1])
        if (!date || close == null) return null
        return { date, close, open: asNum(row[2]), high: asNum(row[3]), low: asNum(row[4]), turnover: asNum(row[5]), volume: asNum(row[6]), trades: asNum(row[7]) }
      }).filter(Boolean)
    }) as { date: string; close: number }[]

    points.sort((a, b) => a.date.localeCompare(b.date))
    return NextResponse.json({ symbol, points, months, manifest })
  } catch (e) {
    return errorResponse({ status: 503, code: "UPSTREAM_UNREACHABLE", message: `Indices history unreachable. ${e instanceof Error ? e.message : ""}` })
  }
}
