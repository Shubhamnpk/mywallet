import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const NEPSE_API = process.env.NEPSE_API_URL || "https://nepse.bitnepal.net"
const YONEPSE_FALLBACK = "https://shubhamnpk.github.io/yonepse/data/nepse_data.json"

interface NepseManStock {
  symbol: string
  securityName: string
  lastUpdatedPrice: number | null
  previousDayClosePrice: number | null
  highPrice: number | null
  lowPrice: number | null
  totalTradedQuantity: number | null
  totalTradedValue: number | null
  lastUpdatedTime: string | null
  totalTrades: number | null
}

function transformNepseManData(stocks: NepseManStock[]) {
  return stocks
    .filter((s) => s.symbol && s.lastUpdatedPrice != null && s.lastUpdatedPrice > 0)
    .map((s) => {
      const ltp = s.lastUpdatedPrice!
      const prevClose = s.previousDayClosePrice ?? ltp
      const change = +(ltp - prevClose).toFixed(2)
      const percentChange = prevClose !== 0 ? +((change / prevClose) * 100).toFixed(2) : 0

      return {
        symbol: s.symbol,
        name: s.securityName || s.symbol,
        ltp,
        previous_close: prevClose,
        change,
        percent_change: percentChange,
        high: s.highPrice ?? ltp,
        low: s.lowPrice ?? ltp,
        volume: s.totalTradedQuantity ?? 0,
        turnover: s.totalTradedValue ?? 0,
        trades: s.totalTrades ?? 0,
        last_updated: s.lastUpdatedTime || new Date().toISOString(),
        market_cap: null as number | null,
      }
    })
}

export async function GET() {
  let lastError = "Data sources returned empty or invalid data"

  // Primary: nepse.bitnepal.net (live data)
  try {
    const response = await fetch(`${NEPSE_API}/api/v1/prices/today?persist=false`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const result = await response.json()
      const stocks = result?.data ?? result
      if (Array.isArray(stocks) && stocks.length > 0) {
        return NextResponse.json(transformNepseManData(stocks))
      }
      lastError = "nepse.bitnepal.net returned empty data"
    } else {
      lastError = `nepse.bitnepal.net returned ${response.status}`
    }
  } catch {
    lastError = "Connection timeout or network error on nepse.bitnepal.net"
  }

  // Fallback: yonepse (static scraper)
  try {
    const response = await fetch(YONEPSE_FALLBACK, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      const prices = Array.isArray(data) ? data : (data.data || data.prices || [])

      if (Array.isArray(prices) && prices.length > 0) {
        return NextResponse.json(prices)
      }
    }
  } catch {
    // silent
  }

  return errorResponse({
    status: 503,
    code: "UPSTREAM_UNREACHABLE",
    message: `Nepal Stock Exchange data is currently unreachable. ${lastError}`,
  })
}
