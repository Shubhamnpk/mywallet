import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const URL = "https://shubhamnpk.github.io/yonepse/data/disclosures.json"

export async function GET() {
  try {
    const response = await fetch(URL, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch disclosures",
      })
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: "Invalid disclosures data format",
      })
    }

    return NextResponse.json(data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Disclosures data is currently unreachable",
    })
  }
}
