import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

type CoinloreListItem = {
  id: string | number
  symbol: string
  name: string
  rank?: string | number
}

type CoinloreTickersResponse = {
  data?: CoinloreListItem[]
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase()

  try {
    const response = await fetch("https://api.coinlore.net/api/tickers/?start=0&limit=200", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(7000),
    })

    if (!response.ok) {
      return errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: `Coinlore responded ${response.status}`,
      })
    }

    const payload = (await response.json()) as CoinloreTickersResponse
    const list = Array.isArray(payload.data) ? payload.data : []

    const filtered = list
      .filter((coin) => {
        if (!query) return true
        const symbol = (coin.symbol || "").toLowerCase()
        const name = (coin.name || "").toLowerCase()
        return symbol.includes(query) || name.includes(query)
      })
      .sort((a, b) => Number(a.rank || Number.MAX_SAFE_INTEGER) - Number(b.rank || Number.MAX_SAFE_INTEGER))
      .slice(0, 20)
      .map((coin) => ({
        id: String(coin.id),
        symbol: (coin.symbol || "").trim().toUpperCase(),
        name: (coin.name || "").trim(),
        rank: Number(coin.rank || 0),
      }))

    return NextResponse.json({ coins: filtered })
  } catch {
    return errorResponse({
      status: 502,
      code: "UPSTREAM_ERROR",
      message: "Failed to load popular coins",
    })
  }
}
