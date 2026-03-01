import { NextResponse } from "next/server"

const URL = "https://shubhamnpk.github.io/nepse-scaper/data/top_stocks.json"

export async function GET() {
  try {
    const response = await fetch(URL, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch top stocks" }, { status: response.status })
    }

    const data = await response.json()
    const isValidObject = data && typeof data === "object"
    if (!isValidObject) {
      return NextResponse.json({ error: "Invalid top stocks data format" }, { status: 502 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Top stocks data is currently unreachable",
        details: e?.message || "Unknown network error",
      },
      { status: 503 },
    )
  }
}
