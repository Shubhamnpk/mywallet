"use client"

export type FundType = "open_end" | "close_end"

export interface Manager {
  slug: string
  name: string
  website: string
  implemented: boolean
  scheme_count: number
  reports_url?: string
  nav_url?: string
}

export interface Scheme {
  symbol: string
  name: string
  fund_type: FundType
  manager: string
  manager_slug: string
  units: number | null
  paid_up: number | null
  face_value: number
  allotment_date: string | null
  maturity_date: string | null
  aliases: string[]
}

export interface PerfRow {
  symbol: string
  name: string
  fund_type: FundType
  manager: string
  total_paid_up: number | null
  maturity_date: string | null
  time_to_mature: string | null
  weekly_nav: number | null
  monthly_nav: number | null
  ltp: number | null
  ltp_vs_weekly_nav_pct: number | null
  holdings_count: number | null
  capital_market_pct: number | null
  fixed_income_pct: number | null
  cash_pct: number | null
  expected_dividend_pct: number | null
  data_status: "ok" | "not_implemented" | "fetch_error" | "parse_error"
}

export interface SchemeReturns {
  available: boolean
  points: number
  start_date: string | null
  as_of: string | null
  latest_nav: number | null
  periods: Array<{ period: string; available: boolean; return_pct?: number; annualized?: boolean }>
  since_inception?: {
    available: boolean
    return_pct: number
    annualized: boolean
    start_date?: string
    span_years?: number
  }
  symbol: string
  basis?: string
  not_enough_history?: boolean
}

export interface SchemeHolding {
  stock_symbol: string
  quantity: number
  ltp: number | null
  market_value: number | null
  [key: string]: unknown
}

export interface SchemeHoldings {
  symbol: string
  count: number
  holdings: SchemeHolding[]
}

export interface NavPoint {
  date: string
  nav: number
  adj_nav: number
}

export interface SchemeNavHistory {
  symbol: string
  points: number
  series: NavPoint[]
}

export type ApplicationIssueType = "ipo" | "right" | "fpo" | "debenture" | "mfs"

export interface ApplicationsSummary {
  source: string
  note: string
  types: ApplicationIssueType[]
  labels: Record<string, string>
  counts: Record<ApplicationIssueType, number>
  total: number
  total_amount?: Record<string, number>
  validated?: boolean
  top?: Array<{ company: string; sector: string; amount: number }>
}

export interface ApplicationRecord {
  sn: number
  company: string
  fund_name?: string | null
  sector: string
  status?: string | null
  issue_type?: string
  ratio?: string | null
  rate?: string | null
  units: number
  amount: number
  public_units?: number | null
  private_units?: number | null
  issue_manager?: string
  date_application?: string
  remarks?: string
}

export interface ApplicationPipeline {
  type: string
  label: string
  title?: string
  fiscal_year?: string
  as_of_bs?: string
  source_pdf?: string
  grouping?: string
  validated?: boolean
  count: number
  total_amount?: number
  records: ApplicationRecord[]
}

export interface SebonNotice {
  title: string
  bs_date?: string | null
  ad_date?: string | null
  english_url?: string | null
  nepali_url?: string | null
}

export interface SebonNotices {
  source: string
  source_url?: string
  note?: string
  families: Array<
    { family: string; label: string; approved: string; application: string } | { family: string; label: string; single: string }
  >
  labels?: Record<string, string>
  counts: Record<string, number>
  total: number
  categories: Record<string, SebonNotice[]>
}

export interface Debenture {
  issuer: string
  instrument: string | null
  coupon_pct?: number | null
  tenor_years?: number | null
  maturity_bs?: number | string | null
  sector?: string | null
  units?: number | null
  face_value?: number | null
  amount_registered?: number | null
  public_issue_amount?: number | null
  private_placement_amount?: number | null
  issue_manager?: string | null
  date_bs?: string | null
  fiscal_year?: string | null
  source?: string | null
  [key: string]: unknown
}

export interface DebenturesSummary {
  count: number
  issuers: number
  amount_registered: number
  public_issue_amount: number
  private_placement_amount: number
  coupon_min: number
  coupon_max: number
  latest_fiscal_year: string
  by_fiscal_year: Record<string, number>
}

export interface DebenturesData {
  source: string
  source_url?: string
  fetched_from?: string
  note?: string
  count: number
  debentures: Debenture[]
  summary?: DebenturesSummary
}

export interface ProductOffer {
  type: string
  label: string
  description: string
  url: string
}

export interface ManagerFact {
  label: string
  value: string
}

export interface SchemeDetailFacts {
  scheme: string
  facts: ManagerFact[]
}

export interface ManagerDocument {
  title: string
  category: string
  url: string
  scheme?: string
  date?: string
}

export interface ManagerProduct {
  slug: string
  name: string
  website: string
  products: ProductOffer[]
  offers: Record<string, boolean>
  sip_offered: boolean
  sip_detail?: string
  portals?: Array<{ label: string; url: string }>
  confidence?: string
  facts_verified?: {
    date: string
    checked: number
    confirmed: number
    removed: number
    corrected: number
    unverifiable: number
    sip_detail?: string
  }
  schemes_detail?: SchemeDetailFacts[]
  documents?: ManagerDocument[]
}

export interface HealthStatus {
  status: string
  schemes: number
  managers: number
  adapters_implemented: string[]
  snapshot_loaded: boolean
  snapshot_as_of?: string
  db_ready: boolean
  serving_from: string
}

const API_BASE = "/api/mutual-funds"

async function fetchJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message || `Request failed (${res.status})`)
  }
  return res.json()
}

export const mutualFundsApi = {
  managers: () => fetchJson<Manager[]>(`${API_BASE}/managers`),
  schemes: (params?: { manager?: string; type?: FundType }) =>
    fetchJson<Scheme[]>(`${API_BASE}/schemes`, params),
  scheme: (symbol: string) => fetchJson<Scheme>(`${API_BASE}/schemes/${encodeURIComponent(symbol)}`),
  performance: (params?: { manager?: string; type?: FundType; symbols?: string }) =>
    fetchJson<PerfRow[]>(`${API_BASE}/performance`, params),
  returns: (symbol: string) => fetchJson<SchemeReturns>(`${API_BASE}/schemes/${encodeURIComponent(symbol)}/returns`),
  holdings: (symbol: string) => fetchJson<SchemeHoldings>(`${API_BASE}/schemes/${encodeURIComponent(symbol)}/holdings`),
  navHistory: (symbol: string) => fetchJson<SchemeNavHistory>(`${API_BASE}/schemes/${encodeURIComponent(symbol)}/nav-history`),
  health: () => fetchJson<HealthStatus>(`${API_BASE}/health`),
  applications: () => fetchJson<ApplicationsSummary>(`${API_BASE}/applications`),
  application: (issueType: ApplicationIssueType) => fetchJson<ApplicationPipeline>(`${API_BASE}/applications/${issueType}`),
  sebonNotices: () => fetchJson<SebonNotices>(`${API_BASE}/sebon-notices`),
  debentures: () => fetchJson<DebenturesData>(`${API_BASE}/debentures`),
  products: () => fetchJson<ManagerProduct[]>(`${API_BASE}/products`),
  product: (slug: string) => fetchJson<ManagerProduct>(`${API_BASE}/products/${encodeURIComponent(slug)}`),
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)
}

export function formatNav(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export function formatPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`
}
