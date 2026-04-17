import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

type CoinloreListItem = {
  id: string | number
  symbol: string
  name: string
}

type CoinloreTickersResponse = {
  data?: CoinloreListItem[]
  info?: { coins_num?: number }
}

const PAGE_SIZE = 100
const MAX_PAGES = 20

const fetchPage = async (start: number) => {
  const response = await fetch(`https://api.coinlore.net/api/tickers/?start=${start}&limit=${PAGE_SIZE}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(7000),
  })
  if (!response.ok) {
    throw new Error(`Coinlore responded ${response.status}`)
  }
  const payload = (await response.json()) as CoinloreTickersResponse
  return payload
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "").trim().toUpperCase()
  if (!symbol) {
    return errorResponse({
      status: 400,
      code: "BAD_REQUEST",
      message: "Provide symbol in ?symbol=BTC",
    })
  }

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const start = page * PAGE_SIZE
      const payload = await fetchPage(start)
      const list = Array.isArray(payload.data) ? payload.data : []
      const match = list.find((item) => (item.symbol || "").trim().toUpperCase() === symbol)
      if (match) {
        return NextResponse.json({
          id: String(match.id),
          symbol: (match.symbol || "").trim().toUpperCase(),
          name: (match.name || "").trim(),
        })
      }

      // Stop early if this page already exceeded total coin count.
      const total = Number(payload.info?.coins_num || 0)
      if (total > 0 && start + PAGE_SIZE >= total) break
      if (list.length < PAGE_SIZE) break
    }

    return errorResponse({
      status: 404,
      code: "UPSTREAM_ERROR",
      message: `No Coinlore asset found for symbol "${symbol}"`,
    })
  } catch {
    return errorResponse({
      status: 502,
      code: "UPSTREAM_ERROR",
      message: "Failed to resolve symbol from Coinlore",
    })
  }
}
