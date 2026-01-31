import { NextResponse } from "next/server"

export async function GET() {
    const URL = "https://shubhamnpk.github.io/nepse-scaper/data/nepse_sector_wise_codes.json"

    try {
        const response = await fetch(URL, {
            next: { revalidate: 86400 }, // Cache for 24 hours as sectors don't change often
            signal: AbortSignal.timeout(8000)
        })

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch sector data" }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (e: any) {
        console.error("Failed to fetch sectors:", e.message)
        return NextResponse.json({ error: "Network error fetching sector data" }, { status: 500 })
    }
}
