import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

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

const normalizeSymbol = (value: string) => value.trim().toUpperCase()

const asFiniteNumber = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const isDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const isMonthKey = (value: string) => /^\d{4}-\d{2}$/.test(value)

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
  const requestedDate = searchParams.get("date") || ""
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
      const date = isDateKey(requestedDate)
        ? requestedDate
        : manifest.latestDate || manifest.availableDays?.at(-1)

      if (!date) {
        return NextResponse.json({ symbol, interval, points: [], manifest })
      }

      const dayPayload = await fetchJson<LtpDailyPayload>(`/daily/${date}.json`, 60)
      const rows = Array.isArray(dayPayload.series?.[symbol]) ? dayPayload.series[symbol] : []
      const points = expandRows(rows, dayPayload.times || [], "time").map((point) => ({
        ...point,
        date,
      }))

      return NextResponse.json({
        symbol,
        interval,
        date,
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
