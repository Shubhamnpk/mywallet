import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"

const FINANCIALS_URL = "https://shubhamnpk.github.io/yonepse/data/company/financials.json"
const METADATA_URL = "https://shubhamnpk.github.io/yonepse/data/company/metadata.json"
const DEFAULT_DOCUMENT_BASE_URL = "https://www.nepalstock.com.np/api/nots/security/fetchFiles?fileLocation="
const CACHE_TTL_MS = 15 * 60 * 1000

type UpstreamDocument = {
  path?: string
  [key: string]: unknown
}

type UpstreamReport = {
  documents?: UpstreamDocument[]
  [key: string]: unknown
}

type UpstreamCompanyFinancials = {
  id?: number
  symbol?: string
  reports?: UpstreamReport[]
}

type CompanyFinancialsCache = {
  expiresAt: number
  bySymbol: Map<string, UpstreamCompanyFinancials>
  metadata: Record<string, unknown>
}

let financialsCache: CompanyFinancialsCache | null = null
let financialsCachePromise: Promise<CompanyFinancialsCache> | null = null

const normalizeSymbol = (value: string) => value.trim().toUpperCase()

const buildDocumentUrl = (path: unknown, baseUrl: string) => {
  const encodedPath = String(path || "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")

  return encodedPath ? `${baseUrl}${encodedPath}` : ""
}

const fetchCompanyFinancialsCache = async (): Promise<CompanyFinancialsCache> => {
  const [financialsResponse, metadataResponse] = await Promise.all([
    fetch(FINANCIALS_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }),
    fetch(METADATA_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    }),
  ])

  if (!financialsResponse.ok) {
    throw new Error(`Financial reports source returned ${financialsResponse.status}`)
  }

  const financials = await financialsResponse.json()
  const metadata = metadataResponse.ok ? await metadataResponse.json() : {}

  if (!Array.isArray(financials)) {
    throw new Error("Invalid company financial data format.")
  }

  const bySymbol = new Map<string, UpstreamCompanyFinancials>()
  ;(financials as UpstreamCompanyFinancials[]).forEach((company) => {
    const companySymbol = normalizeSymbol(String(company?.symbol || ""))
    if (companySymbol) bySymbol.set(companySymbol, company)
  })

  return {
    expiresAt: Date.now() + CACHE_TTL_MS,
    bySymbol,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  }
}

const getCompanyFinancialsCache = async () => {
  if (financialsCache && financialsCache.expiresAt > Date.now()) {
    return financialsCache
  }

  if (!financialsCachePromise) {
    financialsCachePromise = fetchCompanyFinancialsCache()
      .then((cache) => {
        financialsCache = cache
        return cache
      })
      .finally(() => {
        financialsCachePromise = null
      })
  }

  try {
    return await financialsCachePromise
  } catch (error) {
    if (financialsCache) return financialsCache
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
    const { bySymbol, metadata } = await getCompanyFinancialsCache()

    const documentBaseUrl =
      typeof metadata?.document_base_url === "string" && metadata.document_base_url
        ? metadata.document_base_url
        : DEFAULT_DOCUMENT_BASE_URL

    const company = bySymbol.get(symbol) || null
    const reports = Array.isArray(company?.reports)
      ? company.reports.map((report) => ({
          ...report,
          documents: Array.isArray(report?.documents)
            ? report.documents.map((document) => ({
                ...document,
                url: buildDocumentUrl(document?.path, documentBaseUrl),
              }))
            : [],
        }))
      : []

    return NextResponse.json(
      {
        symbol,
        company: company ? { id: company.id, symbol: company.symbol, reports } : null,
        metadata: {
          last_updated: metadata?.last_updated,
          source: metadata?.source,
          count: metadata?.count,
          document_base_url: documentBaseUrl,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
          "X-Company-Financials-Cache": financialsCache && financialsCache.expiresAt > Date.now() ? "HIT" : "MISS",
        },
      },
    )
  } catch (error) {
    return errorResponse({
      status: 503,
      code: "UPSTREAM_UNREACHABLE",
      message: `Company financial reports are currently unreachable. ${error instanceof Error ? error.message : ""}`.trim(),
    })
  }
}
