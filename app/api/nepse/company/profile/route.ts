import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const PROFILE_URL = "https://shubhamnpk.github.io/yonepse/data/company/profiles.json"
const CACHE_TTL_MS = 15 * 60 * 1000

type UpstreamCompanyProfile = {
  symbol?: string
  [key: string]: unknown
}

type CompanyProfileCache = {
  expiresAt: number
  bySymbol: Map<string, UpstreamCompanyProfile>
}

let profileCache: CompanyProfileCache | null = null
let profileCachePromise: Promise<CompanyProfileCache> | null = null

const normalizeSymbol = (value: string) => value.trim().toUpperCase()

const fetchCompanyProfileCache = async (): Promise<CompanyProfileCache> => {
  const response = await fetch(PROFILE_URL, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) {
    throw new Error(`Company profile source returned ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error("Invalid company profile data format.")
  }

  const bySymbol = new Map<string, UpstreamCompanyProfile>()
  ;(data as UpstreamCompanyProfile[]).forEach((profile) => {
    const profileSymbol = normalizeSymbol(String(profile?.symbol || ""))
    if (profileSymbol) bySymbol.set(profileSymbol, profile)
  })

  return {
    expiresAt: Date.now() + CACHE_TTL_MS,
    bySymbol,
  }
}

const getCompanyProfileCache = async () => {
  if (profileCache && profileCache.expiresAt > Date.now()) {
    return profileCache
  }

  if (!profileCachePromise) {
    profileCachePromise = fetchCompanyProfileCache()
      .then((cache) => {
        profileCache = cache
        return cache
      })
      .finally(() => {
        profileCachePromise = null
      })
  }

  try {
    return await profileCachePromise
  } catch (error) {
    if (profileCache) return profileCache
    throw error
  }
}

export async function GET(request: NextRequest) {
  const symbol = normalizeSymbol(request.nextUrl.searchParams.get("symbol") || "")

  if (!symbol) {
    return errorResponse({
      status: 400,
      code: "BAD_REQUEST",
      message: "A symbol query parameter is required.",
    })
  }

  try {
    const { bySymbol } = await getCompanyProfileCache()
    const profile = bySymbol.get(symbol) || null

    return NextResponse.json(
      { symbol, profile },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
          "X-Company-Profile-Cache": profileCache && profileCache.expiresAt > Date.now() ? "HIT" : "MISS",
        },
      },
    )
  } catch (error) {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: `Company profile data is currently unreachable. ${error instanceof Error ? error.message : ""}`.trim(),
    })
  }
}
