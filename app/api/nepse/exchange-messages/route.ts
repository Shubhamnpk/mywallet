import { NextResponse } from "next/server"

const URL = "https://shubhamnpk.github.io/yonepse/data/exchange_messages.json"

export async function GET() {
  try {
    const response = await fetch(URL, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch exchange messages" }, { status: response.status })
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid exchange messages data format" }, { status: 502 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Exchange messages are currently unreachable",
        details: e?.message || "Unknown network error",
      },
      { status: 503 },
    )
  }
}
