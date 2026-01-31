import { NextResponse } from "next/server"

export async function GET() {
    const APIS = [
        "https://shubhamnpk.github.io/nepse-scaper/data/nepse_data.json" // Primary: User's personal scraper
    ]

    let lastError = "Data sources returned empty or invalid data"

    for (const url of APIS) {
        try {
            const response = await fetch(url, {
                next: { revalidate: 300 }, // Cache for 5 mins instead of 1 hour for better accuracy
                signal: AbortSignal.timeout(8000) // Increase to 8s
            })

            if (response.ok) {
                const data = await response.json()
                // Handle different response formats (some APIs return { data: [...] })
                const prices = Array.isArray(data) ? data : (data.data || data.prices || [])

                if (Array.isArray(prices) && prices.length > 0) {
                    return NextResponse.json(prices)
                }
            } else {
                lastError = `Source ${url} returned ${response.status}`
            }
        } catch (e: any) {
            console.warn(`Failed to fetch from ${url}:`, e.message)
            lastError = `Connection timeout or network error on ${url}`
        }
    }

    return NextResponse.json({
        error: "Nepal Stock Exchange data is currently unreachable",
        details: lastError,
        message: "Community APIs are likely down or sleeping. Please try again in 30 seconds."
    }, { status: 503 })
}
