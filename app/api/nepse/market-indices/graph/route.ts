import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const BASE_URL = "https://nepse.bitnepal.net/api/v1/indices"

const INDEX_MAP: Record<string, string> = {
  nepse: "nepse",
  sensitive: "sensitive",
  float: "float",
  sensitive_float: "sensitive_float",
  banking: "banking",
  dev_bank: "dev_bank",
  finance: "finance",
  hotel_tourism: "hotel_tourism",
  hydro: "hydro",
  investment: "investment",
  life_insurance: "life_insurance",
  manufacturing: "manufacturing",
  microfinance: "microfinance",
  mutual_fund: "mutual_fund",
  non_life_insurance: "non_life_insurance",
  others: "others",
  trading: "trading",
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const indexName = searchParams.get("index") || "nepse"

    if (searchParams.get("detail") === "1") {
      const [nepseRes, subRes] = await Promise.all([
        fetch(`${BASE_URL}/nepse`, {
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`${BASE_URL}/subindices`, {
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(8000),
        }),
      ])

      if (!nepseRes.ok || !subRes.ok) {
        return errorResponse({
          status: nepseRes.ok ? subRes.status : nepseRes.status,
          code: "UPSTREAM_ERROR",
          message: "Failed to fetch index details",
        })
      }

      const nepseJson = await nepseRes.json()
      const subJson = await subRes.json()
      const main = Array.isArray(nepseJson?.data) ? nepseJson.data : []
      const sub = Array.isArray(subJson?.data) ? subJson.data : []
      return NextResponse.json([...main, ...sub])
    }

    const mapped = INDEX_MAP[indexName]
    if (!mapped) {
      return errorResponse({
        status: 400,
        code: "BAD_REQUEST",
        message: `Invalid index name. Supported: ${Object.keys(INDEX_MAP).join(", ")}`,
      })
    }

    const response = await fetch(`${BASE_URL}/graph/${mapped}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: "Failed to fetch index graph data",
      })
    }

    const result = await response.json()
    if (!result?.data || !Array.isArray(result.data)) {
      return errorResponse({
        status: 502,
        code: "UPSTREAM_ERROR",
        message: "Invalid index graph data format",
      })
    }

    return NextResponse.json(result.data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Index graph data is currently unreachable",
    })
  }
}
