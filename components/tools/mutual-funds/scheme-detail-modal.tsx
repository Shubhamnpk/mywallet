"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {TrendingUp,TrendingDown,X,Layers,Building2,Sparkles,Activity,ExternalLink,ScrollText,FileText,BookOpen,RefreshCcw,Building,ChevronRight,} from "lucide-react"
import {ResponsiveContainer,LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip,PieChart as RePieChart,Pie,Cell,} from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal"
import { SkeletonStatGrid, SkeletonSectionTitle, SkeletonList, SkeletonChart, SkeletonDonut, SkeletonBlock } from "@/components/ui/modal-skeletons"
import { cn } from "@/lib/utils"
import { compactAmount } from "@/lib/money-format"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import {
  mutualFundsApi,
  formatNav,
  formatPct,
  type PerfRow,
  type Scheme,
  type Manager,
  type ManagerProduct,
  type SchemeReturns,
  type SchemeHoldings,
} from "@/lib/mutual-funds"
type Tab = "overview" | "nav" | "returns" | "holdings"
type PriceHistoryRange = "1M" | "6M" | "1Y" | "5Y" | "ALL"
type PriceHistoryFrequency = "daily" | "weekly" | "monthly" | "yearly"
type LtpHistoryPoint = {
  date: string
  ltp: number
  volume?: number
  turnover?: number
  trades?: number
  points?: number
}

const PRICE_HISTORY_FREQUENCIES: Array<{ value: PriceHistoryFrequency; label: string }> = [
  { value: "daily", label: "1D" },
  { value: "weekly", label: "1W" },
  { value: "monthly", label: "1M" },
  { value: "yearly", label: "1Y" },
]

const PRICE_HISTORY_RANGES: Array<{ value: PriceHistoryRange; label: string; months: number }> = [
  { value: "1M", label: "1M", months: 1 },
  { value: "6M", label: "6M", months: 6 },
  { value: "1Y", label: "1Y", months: 12 },
  { value: "5Y", label: "5Y", months: 60 },
  { value: "ALL", label: "All", months: 120 },
]

const getPriceHistoryRangeConfig = (range: PriceHistoryRange) =>
  PRICE_HISTORY_RANGES.find((r) => r.value === range) || PRICE_HISTORY_RANGES[1]

const getWeekKey = (date: Date) => {
  const firstDayOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((date.getTime() - firstDayOfYear) / 86400000)
  return `${date.getUTCFullYear()}-W${Math.floor(dayOfYear / 7) + 1}`
}

const aggregatePriceHistory = (points: LtpHistoryPoint[], grouping: PriceHistoryFrequency) => {
  if (grouping === "daily") return points

  const buckets = new Map<string, {
    date: string
    ltpTotal: number
    points: number
  }>()

  points.forEach((point) => {
    const parsed = new Date(`${point.date}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) return
    const key = grouping === "yearly" ? point.date.slice(0, 4) : grouping === "monthly" ? point.date.slice(0, 7) : getWeekKey(parsed)
    const existing = buckets.get(key) || { date: point.date, ltpTotal: 0, points: 0 }
    existing.date = point.date
    existing.ltpTotal += point.ltp
    existing.points += 1
    buckets.set(key, existing)
  })

  return Array.from(buckets.values())
    .map((bucket) => ({
      date: bucket.date,
      ltp: bucket.points > 0 ? bucket.ltpTotal / bucket.points : 0,
      points: bucket.points,
    }))
    .filter((point) => point.ltp > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

const DONUT_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6", "#f43f5e", "#6366f1"]

type HoldingsRow = { symbol: string; name: string; shares: number; ltp: number | null; marketValue: number }

function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function SchemeDetailModal({ scheme, schemeDetail, manager, onOpenChange, onOpenManager }: {
  scheme: PerfRow | null
  schemeDetail: Scheme | null
  manager: Manager | null
  onOpenChange: (open: boolean) => void
  onOpenManager?: (name: string) => void
}) {
  const open = !!scheme
  const calendarSystem = useCalendarSystem()
  const [tab, setTab] = useState<Tab>("overview")
  const [returns, setReturns] = useState<SchemeReturns | null>(null)
  const [holdings, setHoldings] = useState<SchemeHoldings | null>(null)
  const [productDetail, setProductDetail] = useState<ManagerProduct | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scheme) return
    setTab("overview")
    setReturns(null)
    setHoldings(null)
    setProductDetail(null)
    setPreviewDoc(null)
    setError(null)
    setIsLoading(true)
    const symbol = scheme.symbol
    const managerSlug = manager?.slug
    const load = async () => {
      try {
        const [retRes, holdRes, prodRes] = await Promise.all([
          mutualFundsApi.returns(symbol).catch(() => null),
          mutualFundsApi.holdings(symbol).catch(() => null),
          managerSlug ? mutualFundsApi.product(managerSlug).catch(() => null) : Promise.resolve(null),
        ])
        setReturns(retRes)
        setHoldings(holdRes)
        setProductDetail(prodRes)
      } catch {
        setError("Failed to load scheme details")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [scheme, manager])

  const holdingsList = useMemo<HoldingsRow[]>(() => {
    if (!holdings?.holdings) return []
    return holdings.holdings
      .map((h, i) => {
        const shares = Number(h.quantity ?? 0)
        const marketValue = h.market_value !== null && h.market_value !== undefined
          ? Number(h.market_value)
          : shares * Number(h.ltp ?? 0)
        return {
          symbol: String(h.stock_symbol ?? `#${i + 1}`),
          name: "",
          shares,
          ltp: h.ltp !== null && h.ltp !== undefined ? Number(h.ltp) : null,
          marketValue,
        }
      })
      .filter((h) => h.shares > 0 || h.marketValue > 0)
  }, [holdings])

  const allReturns = useMemo(() => {
    if (!returns?.available) return []
    return [
      ...(returns.periods?.map((p) => ({
        period: p.period,
        value: p.available ? p.return_pct ?? null : null,
        annualized: p.annualized ?? false,
        available: p.available ?? false,
      })) ?? []),
      ...(returns.since_inception
        ? [{ period: "Since Inception", value: returns.since_inception.available ? returns.since_inception.return_pct : null, annualized: returns.since_inception.annualized, available: returns.since_inception.available }]
        : []),
    ]
  }, [returns])

  /* ── Derived display values ─────────────────────────── */
  const weekly = scheme?.weekly_nav ?? null
  const monthly = scheme?.monthly_nav ?? null
  const primaryNav = weekly ?? monthly
  const primaryNavLabel = weekly != null ? "Weekly NAV" : monthly != null ? "Monthly NAV" : "NAV"
  const ltpVsNav = scheme?.ltp_vs_weekly_nav_pct
  const trendPositive = ltpVsNav != null && ltpVsNav >= 0
  const ltp = scheme?.ltp
  const ltpTrendPositive = ltp != null && weekly != null && ltp >= weekly
  const paidUp = schemeDetail?.paid_up ?? scheme?.total_paid_up ?? null
  const faceValue = schemeDetail?.face_value ?? null
  const maturity = schemeDetail?.maturity_date ?? scheme?.maturity_date ?? null
  const allotted = schemeDetail?.allotment_date ?? null
  const fundTypeLabel =
    scheme?.fund_type === "open_end" ? "Open-End" : scheme?.fund_type === "close_end" ? "Close-End" : "Mutual Fund"

  /* ── Manager product detail (prospectus facts + documents) ── */
  const schemeFacts = useMemo(() => {
    if (!productDetail?.schemes_detail || !scheme) return []
    const match = productDetail.schemes_detail.find((sd) => {
      const head = sd.scheme.trim().split(/[([ ]/)[0].toUpperCase()
      return head === scheme.symbol.toUpperCase() || sd.scheme.toUpperCase().includes(scheme.symbol.toUpperCase())
    })
    return match?.facts ?? []
  }, [productDetail, scheme])

  const schemeDocuments = useMemo(() => {
    if (!productDetail?.documents || !scheme) return []
    return productDetail.documents.filter((d) => (d.scheme ?? "").toUpperCase() === scheme.symbol.toUpperCase())
  }, [productDetail, scheme])

  const navReportDocs = useMemo(
    () => schemeDocuments.filter((d) => /nav/i.test(d.category ?? "")).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [schemeDocuments],
  )
  const prospectusDocs = useMemo(
    () => schemeDocuments.filter((d) => /prospectus/i.test(d.category ?? "")),
    [schemeDocuments],
  )

  const tabs: Array<{ key: Tab; label: string;  }> = [
    { key: "overview", label: "Overview"},
    { key: "nav", label: "NAV"},
    { key: "returns", label: "Returns"},
    { key: "holdings", label: "Holdings"},
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {scheme && (
        <DialogContent
          className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col gap-0 h-[85vh] sm:h-[86vh] lg:h-[88vh]"
          showCloseButton={false}
        >
          <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative text-left">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted hover:text-muted-foreground text-muted-foreground transition-all z-50 border border-muted-foreground/10"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex items-center justify-between mb-2 pr-8">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                Mutual Fund Details
              </Badge>
              {scheme.data_status !== "ok" && (
                <Badge variant="destructive" className="text-[9px] h-5 px-2 font-bold">
                  Data: {scheme.data_status}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="text-3xl font-black tracking-tight flex items-center flex-wrap gap-2">
                  {scheme.symbol}
                  <Badge className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border-primary/30">
                    {fundTypeLabel}
                  </Badge>
                </DialogTitle>
                <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mt-0.5 line-clamp-1 text-left">
                  {scheme.name}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenManager?.(scheme.manager)}
                  className="text-sm font-medium mt-1 text-left text-muted-foreground inline-flex items-center gap-1.5 hover:text-primary transition-colors group/manager"
                >
                  <Building className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/manager:text-primary" />
                  {scheme.manager}
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover/manager:text-primary transition-transform group-hover/manager:translate-x-0.5" />
                </button>
              </div>
              <div className="text-right ml-4">
                <div className="text-2xl font-black font-mono">
                  {formatNav(primaryNav)}
                </div>
                <div className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                  trendPositive
                    ? "text-green-600 bg-green-500/10"
                    : "text-red-600 bg-red-500/10"
                )}>
                  {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatPct(ltpVsNav)}
                </div>
                <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                  {primaryNavLabel}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-0 overflow-hidden relative z-10">
            {error ? (
              <div className="flex-1 flex items-center justify-center text-sm text-destructive font-medium">{error}</div>
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1 flex flex-col gap-0 overflow-hidden">
                <div className="px-6 py-1 border-b border-muted/20 bg-muted/5 shrink-0">
                  <TabsList className="h-9 w-full justify-start gap-3 overflow-x-auto rounded-none border-0 bg-transparent p-0 shadow-none">
                    {tabs.map((t) => (
                      <TabsTrigger
                        key={t.key}
                        value={t.key}
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest gap-1.5"
                      >
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto bg-muted/5">
                  <div className="p-6 pt-4 space-y-4">
                    <TabsContent value="overview" className="m-0 space-y-4">
                      {isLoading ? (
                        <SchemeOverviewSkeleton />
                      ) : (
                        <>
                      {/* Market snapshot */}
                      <section>
                        <SectionLabel icon={Activity} title="Market Snapshot" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                          <CompactStat
                            label="Weekly NAV"
                            value={formatNav(weekly)}
                            hint={weekly != null && monthly != null ? `${formatNav(monthly)} monthly` : "latest published"}
                          />
                          <CompactStat
                            label="Monthly NAV"
                            value={formatNav(monthly)}
                            hint={weekly != null && monthly != null ? `${formatNav(weekly)} weekly` : undefined}
                          />
                          <CompactStat
                            label="LTP"
                            value={ltp != null ? formatNav(ltp) : "-"}
                            tone={ltpTrendPositive ? "text-success" : "text-error"}
                            hint="NEPSE traded"
                          />
                          <CompactStat
                            label="LTP vs NAV"
                            value={formatPct(ltpVsNav)}
                            tone={trendPositive ? "text-success" : "text-error"}
                            hint={ltpVsNav != null ? (ltpVsNav >= 0 ? "trading at premium" : "trading at discount") : "not traded"}
                          />
                        </div>
                      </section>

                      {/* Allocation + Dividend */}
                      {scheme && (
                        <section>
                          <SectionLabel icon={Layers} title="Asset Allocation & Dividend" />
                          <AllocationBar
                            equity={scheme.capital_market_pct}
                            fixed={scheme.fixed_income_pct}
                            cash={scheme.cash_pct}
                            dividend={scheme.expected_dividend_pct}
                          />
                        </section>
                      )}

                      {/* Structure */}
                      <section>
                        <SectionLabel icon={Building2} title="Scheme Structure" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                          <CompactStat label="Face Value" value={formatNav(faceValue)} hint="per unit" />
                          <CompactStat label="Units" value={schemeDetail?.units != null ? compactAmount(schemeDetail.units, calendarSystem) : "-"} />
                          <CompactStat label="Paid-up" value={paidUp != null ? compactAmount(paidUp, calendarSystem) : "-"} />
                          <CompactStat label="Matures" value={maturity ? formatDate(maturity) : "-"} hint={scheme?.time_to_mature ?? undefined} />
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {allotted && (
                            <Badge variant="secondary" className="text-[9px] h-5 px-2 font-bold">
                              Allotted {formatDate(allotted)}
                            </Badge>
                          )}
                          {scheme?.holdings_count != null && (
                            <Badge variant="secondary" className="text-[9px] h-5 px-2 font-bold">
                              {scheme.holdings_count} holdings
                            </Badge>
                          )}
                          {scheme?.expected_dividend_pct != null && (
                            <Badge variant="outline" className="text-[9px] h-5 px-2 font-bold text-primary border-primary/25 bg-primary/5">
                              <Sparkles className="w-2.5 h-2.5 mr-1" /> Exp. div {scheme.expected_dividend_pct.toFixed(1)}%
                            </Badge>
                          )}
                          {manager?.website && (
                            <a
                              href={manager.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-bold text-primary hover:underline shrink-0 inline-flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              {manager.website.replace(/^https?:\/\//, "").replace(/\/+$/, "")}
                            </a>
                          )}
                          {schemeDetail?.aliases?.length ? (
                            <Badge variant="outline" className="text-[9px] h-5 px-2 font-bold text-muted-foreground">
                              Also: {schemeDetail.aliases.join(", ")}
                            </Badge>
                          ) : null}
                        </div>

                        {manager?.reports_url && manager?.nav_url && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider">Manager:</span>
                            {manager.reports_url && (
                              <a
                                href={manager.reports_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/20 px-2 py-0.5 text-[9px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                              >
                                <FileText className="w-2.5 h-2.5" /> Reports
                              </a>
                            )}
                            {manager.nav_url && (
                              <a
                                href={manager.nav_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/20 px-2 py-0.5 text-[9px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                              >
                                <TrendingUp className="w-2.5 h-2.5" /> NAV page
                              </a>
                            )}
                          </div>
                        )}
                      </section>

                      {/* Fund facts from prospectus */}
                      {schemeFacts.length > 0 && (
                        <section>
                          <SectionLabel icon={ScrollText} title="Fund Facts" />
                          <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
                            {schemeFacts.map((f) => (
                              <div key={f.label} className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/70 truncate">
                                  {f.label}
                                </p>
                                <p className="text-[11px] sm:text-xs font-bold leading-snug mt-0.5">{f.value}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Documents: NAV reports + prospectus */}
                      {(navReportDocs.length > 0 || prospectusDocs.length > 0) && (
                        <section>
                          <SectionLabel icon={FileText} title="Documents & Reports" />
                          <div className="space-y-2.5">
                            {prospectusDocs.length > 0 && (
                              <DocumentGroup
                                label="Prospectus"
                                docs={prospectusDocs}
                                accent="text-primary border-primary/25 bg-primary/5"
                                onPreview={(doc) => setPreviewDoc(doc)}
                              />
                            )}
                            {navReportDocs.length > 0 && (
                              <DocumentGroup
                                label="NAV Reports"
                                docs={navReportDocs}
                                accent="text-sky-600 border-sky-500/25 bg-sky-500/5"
                                onPreview={(doc) => setPreviewDoc(doc)}
                              />
                            )}
                          </div>
                        </section>
                      )}
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="nav" className="m-0">
                      {isLoading ? (
                        <SkeletonChart />
                      ) : (
                        <NavTab key={scheme.symbol} symbol={scheme.symbol} />
                      )}
                    </TabsContent>

                    <TabsContent value="returns" className="m-0">
                      {isLoading ? (
                        <SkeletonList count={5} />
                      ) : (
                        <ReturnsTab key={scheme.symbol} returns={returns} all={allReturns} />
                      )}
                    </TabsContent>

                    <TabsContent value="holdings" className="m-0">
                      {isLoading ? (
                        <SchemeHoldingsSkeleton />
                      ) : (
                        <HoldingsTab key={scheme.symbol} holdings={holdingsList} />
                      )}
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            )}
          </div>
        </DialogContent>
      )}

      <DocumentPreviewModal
        open={previewDoc !== null}
        onOpenChange={(o) => { if (!o) setPreviewDoc(null) }}
        url={previewDoc ? `/api/proxy/pdf?url=${encodeURIComponent(previewDoc.url)}` : null}
        sourceUrl={previewDoc?.url ?? null}
        title={previewDoc?.title ?? "Document"}
      />
    </Dialog>
  )
}

/* ── Shared pieces ────────────────────────────────────── */

function SectionLabel({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 mb-2">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</span>
    </div>
  )
}

function CompactStat({ label, value, tone, hint }: {
  label: string
  value: string
  tone?: string
  hint?: string
}) {
  return (
    <div className="px-2 py-1.5 rounded-xl border border-border/30 bg-muted/5">
      <span className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={cn("text-sm sm:text-base font-black font-mono tracking-tight leading-none", tone ?? "text-foreground")}>
          {value}
        </span>
        {hint && <span className="text-[8px] font-bold text-muted-foreground/55 truncate">{hint}</span>}
      </div>
    </div>
  )
}

function DocumentGroup({ label, docs, accent, onPreview }: {
  label: string
  docs: Array<{ title: string; date?: string; url: string; category?: string }>
  accent: string
  onPreview: (doc: { title: string; url: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const preview = docs.length > 5 ? docs.slice(0, 5) : docs
  const rest = docs.length > 5 ? docs.slice(5) : []
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <BookOpen className="w-3 h-3" />
          {label}
          <span className="rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[8px] font-bold">{docs.length}</span>
        </span>
      </div>
      <div className="divide-y divide-border/20">
        {preview.map((d) => (
          <button
            key={d.url + d.title}
            type="button"
            onClick={() => onPreview({ title: d.title, url: d.url })}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/20 transition-colors group text-left"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate group-hover:text-primary transition-colors">{d.title}</p>
              {d.date && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{d.date}</p>}
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover:text-primary transition-colors" />
          </button>
        ))}
        {!open && rest.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-bold text-primary hover:bg-muted/20 transition-colors"
          >
            Show {rest.length} more
          </button>
        )}
        {open && rest.map((d) => (
          <button
            key={d.url + d.title}
            type="button"
            onClick={() => onPreview({ title: d.title, url: d.url })}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/20 transition-colors group text-left"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate group-hover:text-primary transition-colors">{d.title}</p>
              {d.date && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{d.date}</p>}
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )
}

function AllocationBar({ equity, fixed, cash, dividend }: {  equity: number | null
  fixed: number | null
  cash: number | null
  dividend: number | null
}) {
  if (equity == null && fixed == null && cash == null) {
    return (
      <div className="rounded-2xl border border-dashed border-border/30 bg-muted/5 px-4 py-5 text-center">
        <p className="text-xs text-muted-foreground">Allocation breakdown not published yet</p>
      </div>
    )
  }
  const segments = [
    { label: "Equity", value: equity ?? 0, color: "bg-emerald-500" },
    { label: "Fixed income", value: fixed ?? 0, color: "bg-sky-500" },
    { label: "Cash & others", value: cash ?? 0, color: "bg-amber-500" },
  ].filter((s) => s.value > 0)
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 sm:p-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
        {segments.map((s) => (
          <div key={s.label} className={cn("h-full transition-all duration-500", s.color)} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", s.color)} />
            {s.label} {s.value.toFixed(1)}%
          </span>
        ))}
        {dividend != null && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-black text-primary">
            <Sparkles className="h-3 w-3" /> Exp. dividend {dividend.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Price Analysis tab ──────────────────────────────── */

function NavTab({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<PriceHistoryRange>("6M")
  const [frequency, setFrequency] = useState<PriceHistoryFrequency>("daily")
  const [priceHistory, setPriceHistory] = useState<LtpHistoryPoint[]>([])
  const [priceHistoryCache, setPriceHistoryCache] = useState<Partial<Record<PriceHistoryRange, LtpHistoryPoint[]>>>({})
  const [isPriceHistoryLoading, setIsPriceHistoryLoading] = useState(false)
  const [priceHistoryError, setPriceHistoryError] = useState<string | null>(null)

  const loadPriceHistory = useCallback(async (nextRange: PriceHistoryRange = range, force = false) => {
    if (isPriceHistoryLoading) return
    const cachedPoints = priceHistoryCache[nextRange]
    if (!force && cachedPoints) {
      setPriceHistory(cachedPoints)
      setPriceHistoryError(null)
      return
    }
    setIsPriceHistoryLoading(true)
    setPriceHistoryError(null)
    try {
      const rangeConfig = getPriceHistoryRangeConfig(nextRange)
      const response = await fetch(`/api/nepse/ltp/history?symbol=${encodeURIComponent(symbol)}&months=${rangeConfig.months}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || "Failed to fetch price history")
      }
      const points = Array.isArray(data?.points) ? data.points : []
      setPriceHistory(points)
      setPriceHistoryCache((current) => ({ ...current, [nextRange]: points }))
    } catch (error: any) {
      setPriceHistoryError(error?.message || "Could not load price history right now.")
    } finally {
      setIsPriceHistoryLoading(false)
    }
  }, [isPriceHistoryLoading, priceHistoryCache, range, symbol])

  useEffect(() => {
    loadPriceHistory(range)
  }, [loadPriceHistory, range])

  const data = useMemo(() => aggregatePriceHistory(priceHistory, frequency), [priceHistory, frequency])

  const stats = useMemo(() => {
    if (data.length === 0) return null
    const first = data[0]
    const latest = data[data.length - 1]
    const bestEntry = data.reduce((best, point) => point.ltp < best.ltp ? point : best, first)
    const bestExit = data.reduce((best, point) => point.ltp > best.ltp ? point : best, first)
    const average = data.reduce((sum, point) => sum + point.ltp, 0) / data.length
    const high = bestExit.ltp
    const low = bestEntry.ltp
    const range = high - low
    const rangePosition = range > 0 ? ((latest.ltp - low) / range) * 100 : 50
    const change = latest.ltp - first.ltp
    const changePercent = first.ltp > 0 ? (change / first.ltp) * 100 : 0
    const fromBestEntry = bestEntry.ltp > 0 ? ((latest.ltp - bestEntry.ltp) / bestEntry.ltp) * 100 : 0
    const fromBestExit = bestExit.ltp > 0 ? ((latest.ltp - bestExit.ltp) / bestExit.ltp) * 100 : 0
    return {
      first,
      latest,
      bestEntry,
      bestExit,
      average,
      high,
      low,
      rangePosition,
      change,
      changePercent,
      fromBestEntry,
      fromBestExit,
    }
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price History</p>
          <p className="text-xs text-muted-foreground">
            {frequency === "daily"
              ? `Daily closes · ${getPriceHistoryRangeConfig(range).label}`
              : frequency === "weekly"
                ? "Weekly avg"
                : frequency === "monthly"
                  ? "Monthly avg"
                  : "Yearly avg"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={frequency} onValueChange={(v) => setFrequency(v as PriceHistoryFrequency)}>
            <SelectTrigger size="sm" className="h-7 w-[62px] rounded-lg border-muted/30 text-[10px] font-black uppercase tracking-widest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICE_HISTORY_FREQUENCIES.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-[10px] font-black uppercase tracking-widest">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-muted/40 bg-muted/10 p-1">
            {PRICE_HISTORY_RANGES.map((rangeOption) => (
              <button
                key={rangeOption.value}
                type="button"
                onClick={() => setRange(rangeOption.value)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  range === rangeOption.value ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {rangeOption.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => loadPriceHistory(range, true)}
            disabled={isPriceHistoryLoading}
            aria-label="Refresh price history"
            title="Refresh price history"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-primary/20 text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isPriceHistoryLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {isPriceHistoryLoading ? (
        <div className="h-[clamp(220px,32vh,300px)] rounded-xl border border-muted/30 bg-muted/10 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Activity className="h-4 w-4 animate-spin" />
            Loading price history...
          </div>
        </div>
      ) : priceHistoryError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-xs font-bold text-destructive">{priceHistoryError}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="h-[clamp(220px,32vh,300px)] rounded-xl border border-dashed border-muted/40 bg-muted/10 flex items-center justify-center px-6 text-center">
          <p className="text-xs font-bold text-muted-foreground">No price history found for {symbol}.</p>
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <PriceStat label="Latest" value={formatNav(stats.latest.ltp)} />
              <PriceStat
                label="Range Move"
                value={formatPct(stats.changePercent)}
                tone={stats.change >= 0 ? "text-green-600" : "text-red-600"}
              />
              <PriceStat label="High" value={formatNav(stats.high)} />
              <PriceStat label="Low" value={formatNav(stats.low)} />
            </div>
          )}

          <div className="h-[clamp(220px,32vh,300px)] shrink-0 rounded-xl border border-primary/10 bg-background/60 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  minTickGap={24}
                  tickFormatter={(value) => {
                    const parsed = new Date(`${value}T00:00:00Z`)
                    return Number.isNaN(parsed.getTime())
                      ? String(value)
                      : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={48} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const row = payload[0]?.payload as LtpHistoryPoint | undefined
                    return (
                      <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                        <p className="text-xs font-bold text-primary">
                          {frequency === "daily" ? "LTP" : "Avg LTP"}: {formatNav(Number(payload[0]?.value || 0))}
                        </p>
                        {row && Number.isFinite(row.points) && row.points && row.points > 1 && (
                          <p className="text-[10px] font-bold text-muted-foreground">{row.points} points</p>
                        )}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ltp"
                  name="LTP"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#f97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-green-700 dark:text-green-300">Best Entry</p>
                    <Badge variant="outline" className="border-green-500/25 bg-green-500/10 text-[8px] font-black uppercase text-green-700 dark:text-green-300">
                      Lowest LTP
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-lg font-black font-mono text-green-700 dark:text-green-300">{formatNav(stats.bestEntry.ltp)}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{stats.bestEntry.date}</p>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                    Latest is {stats.fromBestEntry >= 0 ? "+" : ""}{stats.fromBestEntry.toFixed(2)}% from this point.
                  </p>
                </div>
                <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-700 dark:text-red-300">Best Exit</p>
                    <Badge variant="outline" className="border-red-500/25 bg-red-500/10 text-[8px] font-black uppercase text-red-700 dark:text-red-300">
                      Highest LTP
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-lg font-black font-mono text-red-700 dark:text-red-300">{formatNav(stats.bestExit.ltp)}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{stats.bestExit.date}</p>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                    Latest is {stats.fromBestExit >= 0 ? "+" : ""}{stats.fromBestExit.toFixed(2)}% from this point.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Range Position</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      Average LTP {formatNav(stats.average)}
                    </p>
                  </div>
                  <p className="text-sm font-black font-mono">{stats.rangePosition.toFixed(0)}%</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(Math.max(stats.rangePosition, 0), 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>{formatNav(stats.low)}</span>
                  <span>{formatNav(stats.high)}</span>
                </div>
              </div>

              <p className="text-[10px] font-bold text-muted-foreground">
                Showing {data.length} {frequency === "daily" ? "daily" : frequency === "weekly" ? "weekly average" : frequency === "monthly" ? "monthly average" : "yearly average"} point{data.length === 1 ? "" : "s"} from {stats.first.date} to {stats.latest.date}.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}

function PriceStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-black font-mono", tone ?? "")}>{value}</p>
    </div>
  )
}

/* ── Returns tab ──────────────────────────────────────── */

function ReturnsTab({ returns, all }: { returns: SchemeReturns | null; all: Array<{ period: string; value: number | null; annualized: boolean; available: boolean }> }) {
  if (!returns) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-muted-foreground">Returns not available</p>
      </div>
    )
  }
  if (returns.not_enough_history || !returns.available) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm font-bold text-muted-foreground">Not enough history yet</p>
        <p className="text-xs text-muted-foreground/70">
          This scheme only has {returns.points} NAV point{returns.points !== 1 ? "s" : ""} recorded.
          History accrues as snapshots are taken daily.
        </p>
        {returns.latest_nav != null && (
          <div className="flex justify-center pt-2">
            <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-2 text-center">
              <p className="text-[9px] text-muted-foreground font-bold uppercase">Latest NAV</p>
              <p className="text-sm font-mono font-black">{formatNav(returns.latest_nav)}</p>
            </div>
          </div>
        )}
      </div>
    )
  }
  if (all.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-muted-foreground">No return periods available</p>
      </div>
    )
  }
  const availableCount = all.filter((r) => r.available).length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1 px-1">
        <span className="text-[10px] font-bold text-muted-foreground">
          {availableCount} of {all.length} periods available
        </span>
        {returns.as_of && (
          <span className="text-[9px] text-muted-foreground/60">As of {formatDate(returns.as_of)}</span>
        )}
      </div>
      {all.map((r) => {
        const positive = r.value != null && r.value >= 0
        return (
          <div
            key={r.period}
            className={cn(
              "relative flex items-center justify-between rounded-xl border px-4 py-3 overflow-hidden",
              r.available ? "border-border/30 bg-muted/5" : "border-dashed border-border/20 bg-transparent opacity-60",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                r.available ? (positive ? "bg-success" : "bg-error") : "bg-muted-foreground/30",
              )}
            />
            <div className="pl-2">
              <p className="text-xs font-bold">{r.period}</p>
              <p className="text-[9px] text-muted-foreground/70 flex items-center gap-1">
                {r.available ? (
                  r.annualized ? "Annualized (CAGR)" : "Trailing return"
                ) : (
                  "Not enough history yet"
                )}
                {r.annualized && (
                  <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-bold text-primary border-primary/25">
                    CAGR
                  </Badge>
                )}
              </p>
            </div>
            <p className={cn("text-sm font-mono font-black pl-2", r.value != null && (r.value >= 0 ? "text-success" : "text-error"))}>
              {r.value === null ? "-" : formatPct(r.value)}
            </p>
          </div>
        )
      })}
      {availableCount === 0 && returns.basis && (
        <p className="text-[9px] text-muted-foreground/60 pt-1">{returns.basis}</p>
      )}
    </div>
  )
}

/* ── Holdings tab ─────────────────────────────────────── */

function HoldingsTab({ holdings }: { holdings: HoldingsRow[] }) {
  const calendarSystem = useCalendarSystem()
  const total = useMemo(() => holdings.reduce((s, h) => s + h.marketValue, 0), [holdings])
  const sorted = useMemo(() => [...holdings].sort((a, b) => b.marketValue - a.marketValue), [holdings])

  const donut = useMemo(() => {
    const top = sorted.slice(0, 6)
    const topSum = top.reduce((s, h) => s + h.marketValue, 0)
    const rest = total - topSum
    const slices = top.map((h) => ({ name: h.symbol, value: h.marketValue }))
    if (rest > 0.001) slices.push({ name: "Others", value: rest })
    return slices
  }, [sorted, total])

  if (!holdings.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-muted-foreground">No holdings available</p>
      </div>
    )
  }

  const maxWeight = total ? Math.max(...sorted.map((h) => (h.marketValue / total) * 100)) : 1

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <div className="relative h-[150px] w-full sm:h-[170px] sm:w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                  {donut.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ zIndex: 50 }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const p = payload[0]
                    return (
                      <div className="relative z-50 rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg px-2.5 py-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground/70">{p?.name}</p>
                        <p className="text-xs font-black font-mono">{compactAmount(Number(p?.value ?? 0), calendarSystem)}</p>
                        <p className="text-[9px] text-muted-foreground/60">{(total ? (Number(p?.value ?? 0) / total) * 100 : 0).toFixed(1)}% of portfolio</p>
                      </div>
                    )
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-black font-mono">{compactAmount(total, calendarSystem)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Total</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {donut.slice(0, 5).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="font-bold truncate flex-1">{d.name}</span>
                <span className="font-mono font-black text-muted-foreground">{((total ? d.value / total : 0) * 100).toFixed(1)}%</span>
              </div>
            ))}
            <p className="text-[9px] text-muted-foreground/60 pt-1">
              {holdings.length} holdings · ≈ {compactAmount(total, calendarSystem)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((h) => {
          const weight = total ? (h.marketValue / total) * 100 : 0
          return (
            <div key={h.symbol} className="rounded-xl border border-border/30 bg-muted/5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black truncate">{h.symbol}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{h.name || "-"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-black">{compactAmount(h.marketValue, calendarSystem)}</p>
                  <p className="text-[9px] text-muted-foreground/70">
                    {h.shares.toLocaleString()} sh · {h.ltp != null ? formatNav(h.ltp) : "-"} LTP
                  </p>
                </div>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${maxWeight ? Math.max((weight / maxWeight) * 100, 2) : 0}%` }}
                />
              </div>
              <p className="text-[8px] text-muted-foreground/60 mt-0.5">{weight.toFixed(1)}% of portfolio</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Loading skeletons ────────────────────────────────── */

function SchemeOverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <SkeletonSectionTitle />
        <SkeletonStatGrid />
      </div>
      <div>
        <SkeletonSectionTitle />
        <SkeletonBlock className="h-16 rounded-2xl" />
      </div>
      <div>
        <SkeletonSectionTitle />
        <SkeletonStatGrid />
      </div>
      <SkeletonBlock className="h-28 rounded-2xl" />
    </div>
  )
}

function SchemeHoldingsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 sm:p-4">
        <SkeletonDonut />
      </div>
      <SkeletonList count={4} />
    </div>
  )
}
