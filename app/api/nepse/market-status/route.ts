import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const NEPSEMAN_API = process.env.NEPSE_API_URL || "https://nepse.bitnepal.net"
const FALLBACK_URL = "https://shubhamnpk.github.io/yonepse/data/market/status.json"

/**
 * Market open/closed status. Primary source is nepseman-api (NEPSE's own
 * status relayed); falls back to the yonepse scraper boolean if unreachable.
 * Response is normalized to { is_open, status, last_checked } either way.
 */
export async function GET() {
  let lastError = "unknown error"

  try {
    const response = await fetch(`${NEPSEMAN_API}/api/v1/market/status`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    })

    if (response.ok) {
      const payload = await response.json()
      const data = payload?.data
      if (data && typeof data.isOpen === "string") {
        const isOpenUpper = data.isOpen.toUpperCase()
        return NextResponse.json({
          is_open: isOpenUpper === "OPEN",
          status: isOpenUpper,
          last_checked: typeof data.asOf === "string" ? data.asOf : new Date().toISOString(),
          source: "nepseman",
        })
      }
      lastError = "Unexpected payload from nepseman-api"
    } else {
      lastError = `nepseman-api returned ${response.status}`
    }
  } catch {
    lastError = "nepseman-api unreachable"
  }

  // Fallback: yonepse scraper
  try {
    const response = await fetch(FALLBACK_URL, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return errorResponse({
        status: response.status,
        code: "UPSTREAM_ERROR",
        message: `Both market status sources failed. Last error: ${lastError}`,
      })
    }
    const data = await response.json()
    if (!data || typeof data !== "object") {
      return errorResponse({ status: 502, code: "UPSTREAM_ERROR", message: "Invalid market status data format" })
    }
    return NextResponse.json({
      is_open: data.is_open === true,
      status: data.is_open ? "OPEN" : "CLOSED",
      last_checked: typeof data.last_checked === "string" ? data.last_checked : undefined,
      source: "yonepse",
    })
  } catch {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: `Market status data is currently unreachable. Last error: ${lastError}`,
    })
  }
}
