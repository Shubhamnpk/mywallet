import { NextResponse } from "next/server"

const URL = "https://shubhamnpk.github.io/yonepse/data/disclosures.json"

export async function GET() {
  try {
    const response = await fetch(URL, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch disclosures" }, { status: response.status })
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid disclosures data format" }, { status: 502 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Disclosures data is currently unreachable",
        details: e?.message || "Unknown network error",
      },
      { status: 503 },
    )
  }
}
