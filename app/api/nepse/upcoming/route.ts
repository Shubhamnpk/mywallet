import { NextResponse } from "next/server"

export async function GET() {
    const APIS = [
        "https://shubhamnpk.github.io/nepse-scaper/data/upcoming_ipo.json"
    ]

    let lastError = "Data sources returned empty or invalid data"

    for (const url of APIS) {
        try {
            const response = await fetch(url, {
                next: { revalidate: 3600 }, // Cache for 1 hour as IPO data doesn't change frequently
                signal: AbortSignal.timeout(8000)
            })

            if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data) && data.length > 0) {
                    return NextResponse.json(data)
                }
            } else {
                lastError = `Source ${url} returned ${response.status}`
            }
        } catch (e: any) {
            console.warn(`Failed to fetch IPOs from ${url}:`, e.message)
            lastError = `Connection timeout or network error on ${url}`
        }
    }

    return NextResponse.json({
        error: "Upcoming IPO data is currently unreachable",
        details: lastError,
        message: "Please try again later."
    }, { status: 503 })
}
