import { NextResponse } from "next/server"

const URL = "https://shubhamnpk.github.io/yonepse/data/market_summary.json"

export async function GET() {
  try {
    const response = await fetch(URL, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch market summary" }, { status: response.status })
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid market summary data format" }, { status: 502 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Market summary data is currently unreachable",
        details: e?.message || "Unknown network error",
      },
      { status: 503 },
    )
  }
}
