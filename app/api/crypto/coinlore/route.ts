import { NextRequest, NextResponse } from "next/server"

type CoinloreTicker = {
  id: string
  symbol: string
  name: string
  price_usd: string
  percent_change_24h?: string
}

const fetchCoin = async (id: string): Promise<CoinloreTicker | null> => {
  try {
    const response = await fetch(`https://api.coinlore.net/api/ticker/?id=${encodeURIComponent(id)}`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(7000),
    })

    if (!response.ok) return null
    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const item = data[0]
    if (!item || typeof item !== "object") return null

    return {
      id: String(item.id ?? ""),
      symbol: String(item.symbol ?? ""),
      name: String(item.name ?? ""),
      price_usd: String(item.price_usd ?? ""),
      percent_change_24h: item.percent_change_24h != null ? String(item.percent_change_24h) : undefined,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") || ""
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[0-9]+$/.test(id))
    .slice(0, 50)

  if (ids.length === 0) {
    return NextResponse.json({ error: "Please provide one or more numeric Coinlore ids in ?ids=" }, { status: 400 })
  }

  const entries = await Promise.all(
    ids.map(async (id) => [id, await fetchCoin(id)] as const)
  )

  const prices: Record<string, CoinloreTicker> = {}
  entries.forEach(([id, value]) => {
    if (value) prices[id] = value
  })

  return NextResponse.json({
    prices,
    requested: ids,
    found: Object.keys(prices).length,
  })
}
