import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const NEPSE_API = process.env.NEPSE_API_URL || "https://nepse.bitnepal.net"
const LTP_BASE_URL = "https://shubhamnpk.github.io/yonepse/data/ltp"
const DEFAULT_MONTH_LIMIT = 24
const MAX_MONTH_LIMIT = 120

type LtpManifest = {
  latestDate?: string
  availableMonths?: string[]
  availableDays?: string[]
  finalizedThrough?: string
  latestStatus?: string
}

type LtpMonthlyPayload = {
  month?: string
  dates?: string[]
  columns?: string[]
  series?: Record<string, unknown[]>
  updatedAt?: string
}

type LtpDailyPayload = {
  date?: string
  times?: string[]
  columns?: string[]
  series?: Record<string, unknown[]>
  updatedAt?: string
}

type LtpPoint = {
  date: string
  time?: string
  ltp: number
  volume?: number
  turnover?: number
  trades?: number
}

type NepseManGraphTick = {
  contractRate: number | null
  time: number
}

const normalizeSymbol = (value: string) => value.trim().toUpperCase()

const asFiniteNumber = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const isDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const isMonthKey = (value: string) => /^\d{4}-\d{2}$/.test(value)

const formatUnixToTime = (ts: number) => {
  const d = new Date(ts * 1000)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

const formatUnixToDate = (ts: number) => {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
}

async function fetchIntradayFromNepse(symbol: string): Promise<{ date: string; points: LtpPoint[] } | null> {
  const response = await fetch(`${NEPSE_API}/api/v1/securities/${symbol}/graph`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) return null

  const result = await response.json()
  const ticks: NepseManGraphTick[] = result?.data
  if (!Array.isArray(ticks) || ticks.length === 0) return null

  const points: LtpPoint[] = ticks
    .filter((t) => t.contractRate != null && t.contractRate > 0 && t.time)
    .map((t) => ({
      date: formatUnixToDate(t.time),
      time: formatUnixToTime(t.time),
      ltp: t.contractRate!,
    }))

  if (points.length === 0) return null

  return { date: points[0].date, points }
}

async function fetchJson<T>(path: string, revalidate: number): Promise<T> {
  const response = await fetch(`${LTP_BASE_URL}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }

  return response.json() as Promise<T>
}

const expandRows = (
  rows: unknown[],
  labels: string[],
  labelKey: "date" | "time",
): LtpPoint[] => {
  return rows
    .map((row) => {
      if (!Array.isArray(row)) return null
      const labelIndex = Number(row[0])
      const label = labels[labelIndex]
      const ltp = asFiniteNumber(row[1])
      if (!label || ltp === undefined || ltp <= 0) return null

      return {
        [labelKey]: label,
        ltp,
        volume: asFiniteNumber(row[2]),
        turnover: asFiniteNumber(row[3]),
        trades: asFiniteNumber(row[4]),
      } as LtpPoint
    })
    .filter((point): point is LtpPoint => Boolean(point))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = normalizeSymbol(searchParams.get("symbol") || "")
  const interval = searchParams.get("interval") === "intraday" ? "intraday" : "daily"
  const requestedMonth = searchParams.get("month") || ""
  const requestedLimit = Number(searchParams.get("months") || DEFAULT_MONTH_LIMIT)
  const monthLimit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_MONTH_LIMIT, 1),
    MAX_MONTH_LIMIT,
  )

  if (!symbol) {
    return errorResponse({
      status: 400,
      code: "BAD_REQUEST",
      message: "A symbol query parameter is required.",
    })
  }

  try {
    const manifest = await fetchJson<LtpManifest>("/manifest.json", 300)

    if (interval === "intraday") {
      const requestedDate = searchParams.get("date") || ""
      const date = isDateKey(requestedDate) ? requestedDate : ""

      // Primary: nepse.bitnepal.net (live intraday ticks)
      try {
        const nepseData = await fetchIntradayFromNepse(symbol)
        if (nepseData) {
          const filtered = date
            ? nepseData.points.filter((p) => p.date === date)
            : nepseData.points

          if (filtered.length > 0) {
            return NextResponse.json({
              symbol,
              interval,
              date: date || nepseData.date,
              points: filtered,
              manifest,
            })
          }
        }
      } catch {
        // silent — fall through to yonepse
      }

      // Fallback: yonepse (static scraper)
      const fallbackDate = date || manifest.latestDate || manifest.availableDays?.at(-1)

      if (!fallbackDate) {
        return NextResponse.json({ symbol, interval, points: [], manifest })
      }

      const dayPayload = await fetchJson<LtpDailyPayload>(`/daily/${fallbackDate}.json`, 60)
      const rows = Array.isArray(dayPayload.series?.[symbol]) ? dayPayload.series[symbol] : []
      const points = expandRows(rows, dayPayload.times || [], "time").map((point) => ({
        ...point,
        date: fallbackDate,
      }))

      return NextResponse.json({
        symbol,
        interval,
        date: fallbackDate,
        points,
        updatedAt: dayPayload.updatedAt,
        manifest,
      })
    }

    const availableMonths = (manifest.availableMonths || []).filter(isMonthKey).sort()
    const months = isMonthKey(requestedMonth)
      ? [requestedMonth]
      : availableMonths.slice(-monthLimit)

    const payloads = await Promise.allSettled(
      months.map(async (month) => ({
        month,
        payload: await fetchJson<LtpMonthlyPayload>(`/monthly/${month}.json`, 300),
      })),
    )

    const points = payloads.flatMap((result) => {
      if (result.status !== "fulfilled") return []
      const { payload } = result.value
      const rows = Array.isArray(payload.series?.[symbol]) ? payload.series[symbol] : []
      return expandRows(rows, payload.dates || [], "date")
    })

    points.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      symbol,
      interval,
      points,
      months,
      manifest,
    })
  } catch (error) {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: `LTP history is currently unreachable. ${error instanceof Error ? error.message : "Unknown error"}`,
    })
  }
}
