"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Loader2, Search, X, Landmark, ChevronRight, BarChart3, RefreshCw, ArrowDownAZ, ArrowUpAZ, Activity, Users, ExternalLink, Wallet, PiggyBank, ShieldCheck, Building, FileText, TrendingUp, Globe, Coins, Handshake, Settings, Compass, LineChart, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  mutualFundsApi,
  formatMoney,
  formatNav,
  formatPct,
  type Manager,
  type PerfRow,
  type Scheme,
  type FundType,
  type ManagerProduct,
  type HealthStatus,
} from "@/lib/mutual-funds"
import { SchemeDetailModal } from "./scheme-detail-modal"

type FilterType = "all" | FundType

type Tab = "overview" | "funds" | "resources"

const FUND_TYPE_LABEL: Record<FundType, string> = {
  open_end: "Open-End",
  close_end: "Close-End",
}

type SortKey = "default" | "nav" | "ltp" | "ltpVsNav" | "dividend" | "paidUp" | "holdings" | "name" | "symbol"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "nav", label: "NAV" },
  { key: "ltp", label: "LTP" },
  { key: "ltpVsNav", label: "LTP vs NAV" },
  { key: "dividend", label: "Dividend" },
  { key: "paidUp", label: "Paid-up" },
  { key: "holdings", label: "Holdings" },
  { key: "name", label: "Name" },
  { key: "symbol", label: "Symbol" },
]

/** Primary NAV display value, falling back to monthly NAV when weekly is missing. */
const navValue = (r: PerfRow): number | null => r.weekly_nav ?? r.monthly_nav ?? null
const hasNav = (r: PerfRow): boolean => r.weekly_nav != null || r.monthly_nav != null

const sortValue = (r: PerfRow, key: Exclude<SortKey, "default">): number | string | null => {
  switch (key) {
    case "nav": return navValue(r)
    case "ltp": return r.ltp
    case "ltpVsNav": return r.ltp_vs_weekly_nav_pct
    case "dividend": return r.expected_dividend_pct
    case "paidUp": return r.total_paid_up
    case "holdings": return r.holdings_count
    case "name": return r.name.toLowerCase()
    case "symbol": return r.symbol.toLowerCase()
  }
}

const isNullish = (v: unknown): boolean => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))

function sortRows(rows: PerfRow[], key: SortKey, dir: "asc" | "desc"): PerfRow[] {
  const sorted = [...rows]
  if (key === "default") {
    // Schemes without any NAV always sink to the bottom; otherwise stable.
    sorted.sort((a, b) => {
      const aHas = hasNav(a)
      const bHas = hasNav(b)
      if (aHas !== bHas) return aHas ? -1 : 1
      return 0
    })
    return sorted
  }
  sorted.sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    const aNull = isNullish(va)
    const bNull = isNullish(vb)
    if (aNull && bNull) return 0
    if (aNull) return 1
    if (bNull) return -1
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb))
    return dir === "asc" ? cmp : -cmp
  })
  return sorted
}

export function MutualFundsTool() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [performance, setPerformance] = useState<PerfRow[]>([])
  const [products, setProducts] = useState<ManagerProduct[]>([])
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [view, setView] = useState<"schemes" | "managers">("schemes")
  const [searchQuery, setSearchQuery] = useState("")
  const [managerFilter, setManagerFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<FilterType>("all")
  const [sortKey, setSortKey] = useState<SortKey>("default")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedScheme, setSelectedScheme] = useState<PerfRow | null>(null)
  const [detailManager, setDetailManager] = useState<ManagerProduct | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [managersRes, perfRes, schemesRes, productsRes, healthRes] = await Promise.all([
        mutualFundsApi.managers().catch(() => []),
        mutualFundsApi.performance().catch(() => []),
        mutualFundsApi.schemes().catch(() => []),
        mutualFundsApi.products().catch(() => []),
        mutualFundsApi.health().catch(() => null),
      ])
      setManagers(managersRes)
      setPerformance(perfRes)
      setSchemes(schemesRes)
      setProducts(productsRes)
      setHealth(healthRes)
    } catch {
      setError("Failed to load mutual fund data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const schemeBySymbol = useMemo(() => new Map(performance.map((s) => [s.symbol, s])), [performance])

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = performance.filter((row) => {
      if (managerFilter !== "all" && row.manager !== managerFilter) return false
      if (typeFilter !== "all" && row.fund_type !== typeFilter) return false
      if (!q) return true
      return (
        row.symbol.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.manager.toLowerCase().includes(q)
      )
    })
    return sortRows(filtered, sortKey, sortDir)
  }, [performance, searchQuery, managerFilter, typeFilter, sortKey, sortDir])

  const totalSchemes = performance.length
  const openEndCount = performance.filter((r) => r.fund_type === "open_end").length
  const closeEndCount = performance.filter((r) => r.fund_type === "close_end").length
  const avgLtpVsNav = (() => {
    const withData = performance.filter((r) => typeof r.ltp_vs_weekly_nav_pct === "number")
    if (!withData.length) return null
    return withData.reduce((s, r) => s + (r.ltp_vs_weekly_nav_pct as number), 0) / withData.length
  })()
  const totalPaidUp = performance.reduce((s, r) => s + (r.total_paid_up ?? 0), 0)
  const withLtpCount = performance.filter((r) => typeof r.ltp === "number").length

  return (
    <div className="space-y-4">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">Mutual Funds</h2>
              <p className="text-[10px] text-muted-foreground">
                Scheme NAV, performance &amp; returns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
              {(["schemes", "managers"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                    view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "schemes" ? <BarChart3 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                  {v === "schemes" ? "Schemes" : "Managers"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={load} disabled={isLoading} aria-label="Refresh">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Schemes</p>
            <p className="text-sm font-black font-mono">{totalSchemes}</p>
            <p className="text-[9px] text-muted-foreground/70">{openEndCount} open · {closeEndCount} close-end</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Avg LTP vs NAV</p>
            <p className={cn("text-sm font-black font-mono", (avgLtpVsNav ?? 0) >= 0 ? "text-success" : "text-error")}>
              {avgLtpVsNav === null ? "â€”" : formatPct(avgLtpVsNav)}
            </p>
            <p className="text-[9px] text-muted-foreground/70">weekly NAV basis</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Total Paid-up</p>
            <p className="text-sm font-black font-mono">{totalPaidUp ? formatMoney(totalPaidUp) : "â€”"}</p>
            <p className="text-[9px] text-muted-foreground/70">across all schemes</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">LTP Available</p>
            <p className="text-sm font-black font-mono">{withLtpCount} / {totalSchemes}</p>
            <p className="text-[9px] text-muted-foreground/70">traded schemes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Search scheme, symbol, or manager…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs rounded-full bg-muted/40 border-border/30 focus-visible:bg-background focus-visible:border-primary/40 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/25 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/40 bg-background px-2 text-xs font-bold"
              aria-label="Filter by manager"
            >
              <option value="all">All Managers</option>
              {managers.map((m) => (
                <option key={m.slug} value={m.name}>{m.name} ({m.scheme_count})</option>
              ))}
            </select>
            <div className="flex bg-muted/40 rounded-lg p-0.5">
              {(["all", "open_end", "close_end"] as FilterType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                    typeFilter === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "all" ? "All" : FUND_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Managers view */}
        {view === "managers" ? (
          isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-sm font-bold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading managers…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load}>Retry</Button>
            </div>
          ) : (
            <ManagersView
              products={products}
              managers={managers}
              schemes={performance}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenScheme={(sym) => {
                const row = performance.find((r) => r.symbol === sym)
                if (row) setSelectedScheme(row)
              }}
            />
          )
        ) : (
          /* Schemes list */
          isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-sm font-bold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading mutual funds…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load}>Retry</Button>
            </div>
          ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold text-muted-foreground mb-1">
              {searchQuery || managerFilter !== "all" || typeFilter !== "all" ? "No matching schemes" : "No mutual fund data available"}
            </p>
            <p className="text-xs text-muted-foreground/70">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground">
                {filteredRows.length} scheme{filteredRows.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="h-8 rounded-lg border border-border/40 bg-background px-2 text-[11px] font-bold"
                    aria-label="Sort by"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>Sort: {o.label}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Toggle sort direction"
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  >
                    {sortDir === "asc" ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <span className="text-[10px] text-muted-foreground/60">Tap a scheme for NAV & returns</span>
              </div>
            </div>
            {filteredRows.map((row) => (
              <button
                key={row.symbol}
                type="button"
                onClick={() => setSelectedScheme(row)}
                className="w-full flex items-center gap-3 rounded-2xl border border-border/30 bg-muted/5 hover:bg-muted/15 hover:border-primary/30 transition-all text-left px-3.5 py-3.5 active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-[12px]">
                  {row.symbol.slice(0, 4)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black truncate">{row.name}</p>
                    <Badge variant="secondary" className="text-[9px] h-5 px-2 font-bold shrink-0">
                      {FUND_TYPE_LABEL[row.fund_type]}
                    </Badge>
                    {row.time_to_mature && (
                      <Badge variant="outline" className="text-[9px] h-5 px-2 font-bold text-primary shrink-0">
                        {row.time_to_mature}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {row.symbol} · {row.manager}
                  </p>
                  <div className="mt-2 flex items-center gap-3 sm:hidden">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">NAV</span>
                    <span className="text-xs font-mono font-black">{formatNav(navValue(row))}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase ml-auto">LTP vs NAV</span>
                    <span className={cn("text-xs font-mono font-black", (row.ltp_vs_weekly_nav_pct ?? 0) >= 0 ? "text-success" : "text-error")}>
                      {formatPct(row.ltp_vs_weekly_nav_pct)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 hidden sm:flex">
                  <div className="text-right">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">NAV</p>
                    <p className="text-sm font-mono font-black">{formatNav(navValue(row))}</p>
                    {row.weekly_nav == null && row.monthly_nav != null && (
                      <p className="text-[8px] text-muted-foreground/50">monthly</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">LTP vs NAV</p>
                    <p className={cn("text-sm font-mono font-black", (row.ltp_vs_weekly_nav_pct ?? 0) >= 0 ? "text-success" : "text-error")}>
                      {formatPct(row.ltp_vs_weekly_nav_pct)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </button>
            ))}
          </div>
        )
        )}
      </CardContent>

      <SchemeDetailModal
        scheme={selectedScheme}
        schemeDetail={selectedScheme ? schemes.find((s) => s.symbol === selectedScheme.symbol) ?? null : null}
        manager={selectedScheme ? managers.find((m) => m.name === selectedScheme.manager) ?? null : null}
        onOpenChange={(open) => { if (!open) setSelectedScheme(null) }}
        onOpenManager={(name) => {
          const product = products.find((p) => p.name === name) ?? null
          setDetailManager(product)
        }}
      />

      <ManagerDetailModal
        product={detailManager}
        manager={detailManager ? managers.find((m) => m.name === detailManager.name) ?? null : null}
        schemes={detailManager ? performance.filter((s) => s.manager === detailManager.name) : []}
        schemeBySymbol={schemeBySymbol}
        onOpenChange={(open) => { if (!open) setDetailManager(null) }}
        onOpenScheme={(sym) => {
          const row = performance.find((r) => r.symbol === sym)
          setDetailManager(null)
          if (row) setSelectedScheme(row)
        }}
      />
    </div>
  )
}

const OFFER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mutual_fund: Wallet,
  sip: PiggyBank,
  pms: ShieldCheck,
  dp: Building,
  issue_management: Coins,
  underwriting: Handshake,
  rts: LineChart,
  eservices: Settings,
  advisory: Compass,
  sif_pe: UserPlus,
}

const OFFER_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  sip: "SIP",
  pms: "PMS",
  dp: "Demat / DP",
  issue_management: "Issue Mgmt",
  underwriting: "Underwriting",
  rts: "RTS",
  eservices: "e-Services",
  advisory: "Advisory",
  sif_pe: "SIF / PE",
}

function ManagersView({ products, managers, schemes, searchQuery, onSearchChange, onOpenScheme }: {
  products: ManagerProduct[]
  managers: Manager[]
  schemes: PerfRow[]
  searchQuery: string
  onSearchChange: (v: string) => void
  onOpenScheme: (symbol: string) => void
}) {
  const [selected, setSelected] = useState<ManagerProduct | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.products.some((pr) => pr.label.toLowerCase().includes(q)),
    )
  }, [products, searchQuery])

  const mgrBySlug = useMemo(() => new Map(managers.map((m) => [m.slug, m])), [managers])
  const schemeBySymbol = useMemo(() => new Map(schemes.map((s) => [s.symbol, s])), [schemes])

  const handleOpenProduct = (p: ManagerProduct) => setSelected(p)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-muted-foreground">
          {filtered.length} asset manager{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search managers or services…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-52 pl-8 pr-8 text-xs rounded-full bg-muted/40 border-border/30"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/25 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-bold text-muted-foreground mb-1">No matching managers</p>
          <p className="text-xs text-muted-foreground/70">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const mgr = mgrBySlug.get(p.slug)
            const managerSchemes = schemes.filter((s) => s.manager === p.name)
            const enabledServices = (Object.entries(p.offers ?? {}).filter(([, on]) => on) as Array<[string, boolean]>).map(([t]) => t)
            return (
              <button
                key={p.slug}
                type="button"
                onClick={() => handleOpenProduct(p)}
                className="group w-full flex items-center gap-3 rounded-2xl border border-border/30 bg-muted/5 hover:bg-muted/15 hover:border-primary/40 transition-all text-left px-3.5 py-3.5 active:scale-[0.99]"
              >
                <span className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl hidden",
                  p.confidence === "high" ? "bg-success" : "bg-amber-500",
                )} />
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-[12px]",
                  p.confidence === "high"
                    ? "bg-gradient-to-br from-success/25 to-success/5 text-success"
                    : "bg-gradient-to-br from-amber-500/25 to-amber-500/5 text-amber-600",
                )}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black truncate">{p.name}</p>
                    {p.sip_offered && (
                      <Badge variant="outline" className="text-[9px] h-5 px-2 font-bold text-success border-success/30 bg-success/10 shrink-0">
                        SIP
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {managerSchemes.length} mutual funds
                    {enabledServices.length > 0 ? ` · ${enabledServices.length} services` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0 hidden sm:flex">
                  {enabledServices.slice(0, 3).map((t) => {
                    const Icon = OFFER_ICONS[t] ?? ExternalLink
                    return (
                      <span key={t} className="inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground bg-card/70 border border-border/20 px-1.5 py-0.5 rounded-md">
                        <Icon className="w-2.5 h-2.5" />
                        {OFFER_LABELS[t] ?? t}
                      </span>
                    )
                  })}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            )
          })}
        </div>
      )}

      <ManagerDetailModal
        product={selected}
        manager={selected ? mgrBySlug.get(selected.slug) ?? null : null}
        schemes={selected ? schemes.filter((s) => s.manager === (mgrBySlug.get(selected.slug)?.name ?? selected.name)) : []}
        schemeBySymbol={schemeBySymbol}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        onOpenScheme={(sym) => {
          setSelected(null)
          onOpenScheme(sym)
        }}
      />
    </div>
  )
}

function ManagerDetailModal({ product, manager, schemes, schemeBySymbol, onOpenChange, onOpenScheme }: {
  product: ManagerProduct | null
  manager: Manager | null
  schemes: PerfRow[]
  schemeBySymbol: Map<string, PerfRow>
  onOpenChange: (open: boolean) => void
  onOpenScheme: (symbol: string) => void
}) {
  const [tab, setTab] = useState<Tab>("overview")
  useEffect(() => { setTab("overview") }, [product?.slug])

  if (!product) return null

  const enabledServices = (Object.entries(product.offers ?? {}).filter(([, on]) => on) as Array<[string, boolean]>).map(([t]) => t)
  const displaySchemes = schemes.length > 0 ? schemes : (schemeBySymbol.size > 0 ? Array.from(schemeBySymbol.values()).filter((s) => s.manager === product.name) : [])

  const tabs: Array<{ key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "overview", label: "Overview", icon: Building },
    { key: "funds", label: "Managed Funds", icon: Wallet },
    { key: "resources", label: "Resources", icon: FileText },
  ]

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh] sm:h-[86vh] sm:max-h-[86vh] lg:h-[88vh] lg:max-h-[88vh]"
      >
        <DialogHeader className="p-6 pb-3 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative shrink-0">
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted hover:text-muted-foreground text-muted-foreground transition-all z-50 border border-muted-foreground/10 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-sm",
              product.confidence === "high"
                ? "bg-gradient-to-br from-success/25 to-success/5 text-success"
                : "bg-gradient-to-br from-amber-500/25 to-amber-500/5 text-amber-600",
            )}>
              {product.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5 mb-1">
                Asset Manager
              </Badge>
              <DialogTitle className="text-lg font-black tracking-tight leading-tight truncate">{product.name}</DialogTitle>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                The company that manages these mutual funds
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1 flex flex-col gap-0 overflow-hidden">
          <div className="px-6 py-1 border-b border-muted/20 bg-muted/5 shrink-0">
            <TabsList className="h-9 w-full justify-start gap-3 overflow-x-auto rounded-none border-0 bg-transparent p-0 shadow-none">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest gap-1.5 whitespace-nowrap"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-muted/5">
            <div className="p-5 space-y-5">
              <TabsContent value="overview" className="m-0 space-y-4">
                {/* Top facts */}
                <section>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Funds", value: displaySchemes.length, icon: Wallet },
                      { label: "Services", value: enabledServices.length, icon: ShieldCheck },
                      { label: "SIP", value: product.sip_offered ? "Yes" : "No", icon: PiggyBank },
                    ].map((f) => (
                      <div key={f.label} className="rounded-xl border border-border/40 bg-card/60 px-2 py-2.5 text-center">
                        <f.icon className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
                        <p className="text-base font-black leading-none">{f.value}</p>
                        <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wide mt-1">{f.label}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Website</p>
                      {product.website ? (
                        <a href={product.website} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline break-all">
                          {product.website}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground/70">Not available</p>
                      )}
                    </div>
                  </div>
                  {product.portals && product.portals.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <Landmark className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Portals</p>
                        <div className="flex flex-wrap gap-1.5">
                          {product.portals.map((pt, i) => (
                            <a
                              key={`${pt.url}-${i}`}
                              href={pt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> {pt.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <section>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Services offered</p>
                  {product.products.length === 0 ? (
                    <div className="rounded-xl border border-border/30 bg-card/50 p-6 text-center">
                      <ShieldCheck className="w-6 h-6 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">No service details available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {product.products.map((pr) => {
                        const Icon = OFFER_ICONS[pr.type] ?? ExternalLink
                        return (
                          <button
                            key={`${pr.type}-${pr.label}`}
                            type="button"
                            disabled={!pr.url}
                            onClick={() => { if (pr.url) window.open(pr.url, "_blank", "noopener,noreferrer") }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-card/60 px-2 py-3 text-center transition-all",
                              pr.url ? "hover:border-primary/40 hover:bg-muted/10" : "cursor-default",
                            )}
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="w-4 h-4" />
                            </span>
                            <p className="text-[9px] font-bold leading-tight line-clamp-2">{pr.label}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>

                {product.sip_detail && (
                  <div className="rounded-xl border border-border/40 bg-card/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">About their SIP plans</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{product.sip_detail}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="funds" className="m-0 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground">
                    {displaySchemes.length} fund{displaySchemes.length !== 1 ? "s" : ""} managed by this company
                  </p>
                </div>
                {displaySchemes.length === 0 ? (
                  <div className="rounded-xl border border-border/30 bg-card/50 p-6 text-center">
                    <Wallet className="w-6 h-6 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No fund details available yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {displaySchemes.map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        onClick={() => onOpenScheme(s.symbol)}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-border/30 bg-card/60 hover:border-primary/40 hover:bg-muted/10 transition-all text-left px-3 py-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black flex items-center gap-1.5">
                            {s.symbol}
                            <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-bold shrink-0">
                              {FUND_TYPE_LABEL[s.fund_type]}
                            </Badge>
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.name}</p>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary shrink-0">
                          Details <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resources" className="m-0 space-y-4">
                <section>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Useful links</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.website && (
                      <a href={product.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors">
                        <Globe className="w-3 h-3" /> Website
                      </a>
                    )}
                    {manager?.reports_url && (
                      <a href={manager.reports_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors">
                        <FileText className="w-3 h-3" /> Reports
                      </a>
                    )}
                    {manager?.nav_url && (
                      <a href={manager.nav_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors">
                        <TrendingUp className="w-3 h-3" /> NAV page
                      </a>
                    )}
                  </div>
                </section>

                {product.documents && product.documents.length > 0 && (
                  <section>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Documents &amp; reports</p>
                    <div className="space-y-1.5">
                      {product.documents.slice(0, 6).map((d, i) => (
                        <a
                          key={`${d.title}-${i}`}
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-border/30 bg-card/60 px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0 text-primary" />
                          <span className="min-w-0 truncate">{d.title}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
