import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const UPSTREAM_BASE = "https://capitals.nepsetrading.com/api"

// Whitelist of upstream paths this proxy may forward to.
const ALLOWED_PATHS = new Set([
  "health",
  "managers",
  "performance",
  "schemes",
  "schemes/holdings",
  "schemes/nav-history",
  "schemes/returns",
  "applications",
  "sebon-notices",
  "debentures",
  "products",
])

function isValidPath(path: string): boolean {
  // Dynamic scheme paths: schemes/{symbol}, schemes/{symbol}/holdings, etc.
  const schemeRegex = /^schemes\/[A-Za-z0-9_-]+(\/(holdings|nav-history|returns))?$/
  if (schemeRegex.test(path)) return true

  // Dynamic application pipelines: applications/{issue_type}
  const applicationRegex = /^applications\/(ipo|right|fpo|debenture|mfs)$/
  if (applicationRegex.test(path)) return true

  // Dynamic products: products/{slug}, products/compare/{ptype}
  const productRegex = /^products\/(compare\/[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)$/
  if (productRegex.test(path)) return true

  return ALLOWED_PATHS.has(path)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const joined = path.join("/")

  if (!joined || !isValidPath(joined)) {
    return errorResponse({
      status: 400,
      code: "BAD_REQUEST",
      message: `Unsupported mutual fund endpoint: /${joined}`,
    })
  }

  const query = request.nextUrl.searchParams.toString()
  const upstreamUrl = `${UPSTREAM_BASE}/${joined}${query ? `?${query}` : ""}`

  try {
    const response = await fetch(upstreamUrl, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: `Failed to fetch mutual fund data (${response.status})`,
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: "Mutual fund data service is currently unreachable",
    })
  }
}
