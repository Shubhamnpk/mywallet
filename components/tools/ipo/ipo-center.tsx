"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Rocket,
  Search,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  ArrowDownUp,
  Landmark,
  FileText,
  Building2,
  Database,
  Activity,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal"
import { cn } from "@/lib/utils"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { compactAmount } from "@/lib/money-format"
import { UpcomingIPO } from "@/types/wallet"
import { IPODetailModal } from "@/components/tools/portfolio/modals/ipo-detail-modal"
import { MyApplicationsTab } from "@/components/tools/ipo/my-applications-tab"
import {
  mutualFundsApi,
  formatMoney,
  type ApplicationIssueType,
  type ApplicationsSummary,
  type ApplicationPipeline,
  type ApplicationRecord,
  type HealthStatus,
} from "@/lib/mutual-funds"

type StatusFilter = "all" | "open" | "upcoming" | "closed"
type CenterTab = "live" | "pipeline" | "applications"

const STATUS_META: Record<string, { label: string; className: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: "Open Now", className: "text-success bg-success/10 border-success/25", dot: "bg-success", icon: CheckCircle2 },
  upcoming: { label: "Upcoming", className: "text-info bg-info/10 border-info/25", dot: "bg-info", icon: Clock },
  closed: { label: "Closed", className: "text-muted-foreground bg-muted/20 border-muted/30", dot: "bg-muted-foreground/40", icon: Landmark },
}

const ISSUE_TYPE_LABEL: Record<ApplicationIssueType, string> = {
  ipo: "IPO",
  right: "Rights",
  fpo: "FPO",
  debenture: "Debentures",
  mfs: "Mutual Funds",
}

const TAB_DEFS: Array<{ key: CenterTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "live", label: "Live", icon: Rocket },
  { key: "pipeline", label: "Pipeline", icon: ClipboardList },
  { key: "applications", label: "Applications", icon: FileText },
]

function normalizeIpoName(value?: string) {
  return (value || "")
    .toLowerCase()
    .replace(/\b(limited|ltd|public|private|pvt|co|company|inc)\b/g, "")
    .replace(/[().,-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseSortableDate(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

function formatBsDate(value?: string) {
  if (!value) return "—"
  const parts = String(value).split("/")
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]} BS`
  return value
}

function shortCompany(name: string) {
  return name.replace(/^\s*[*#@]\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim()
}

function appInitials(name: string) {
  const clean = shortCompany(name)
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length === 0) return "—"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function ipoCategoryBadges(company: string, issueType?: string): string[] {
  const lower = `${company} ${issueType ?? ""}`.toLowerCase()
  const badges: string[] = []
  if (lower.includes("local")) badges.push("Local")
  if (lower.includes("general")) badges.push("General")
  return badges
}

function categoryBadgeClass(category: string) {
  return category === "Local"
    ? "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-300"
    : "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300"
}

function isPremiumRecord(r: { company?: string; issue_type?: string }) {
  return /premium|@\s*\d+/i.test(`${r.company ?? ""} ${r.issue_type ?? ""}`)
}

const SECTOR_COLORS = [
  { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-300", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25" },
  { bg: "bg-sky-500/15", text: "text-sky-600 dark:text-sky-300", chip: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25" },
  { bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-300", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/25" },
  { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-300", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25" },
  { bg: "bg-rose-500/15", text: "text-rose-600 dark:text-rose-300", chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25" },
  { bg: "bg-indigo-500/15", text: "text-indigo-600 dark:text-indigo-300", chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/25" },
  { bg: "bg-teal-500/15", text: "text-teal-600 dark:text-teal-300", chip: "bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-500/25" },
  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-600 dark:text-fuchsia-300", chip: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/25" },
]

function sectorColor(sector: string) {
  let hash = 0
  for (let i = 0; i < sector.length; i++) hash = (hash * 31 + sector.charCodeAt(i)) >>> 0
  return SECTOR_COLORS[hash % SECTOR_COLORS.length]
}

export function IpoCenter() {
  const { upcomingIPOs, isIPOsLoading, refreshMarketData, userProfile } = useWalletData()
  const calendarSystem = useCalendarSystem()
  const [tab, setTab] = useState<CenterTab>("live")

  // Live tab state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [reservedOnly, setReservedOnly] = useState(false)
  const [selectedIpo, setSelectedIpo] = useState<UpcomingIPO | null>(null)
  const [isIpoDetailOpen, setIsIpoDetailOpen] = useState(false)

  // SEBON data state
  const [appsSummary, setAppsSummary] = useState<ApplicationsSummary | null>(null)
  const [pipeline, setPipeline] = useState<ApplicationPipeline | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [isSebonLoading, setIsSebonLoading] = useState(false)
  const [sebonError, setSebonError] = useState<string | null>(null)
  const [issueType, setIssueType] = useState<ApplicationIssueType>("ipo")
  const [pipelineSearch, setPipelineSearch] = useState("")
  const [pipelineSector, setPipelineSector] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "general" | "local">("all")
  const [premiumFilter, setPremiumFilter] = useState<"all" | "premium" | "normal">("all")
  const [sortBy, setSortBy] = useState<"default" | "amount-desc" | "amount-asc" | "units-desc" | "date-desc" | "company">("default")

  const loadSebon = async (type?: ApplicationIssueType) => {
    setIsSebonLoading(true)
    setSebonError(null)
    try {
      const [summary, app, healthRes] = await Promise.all([
        mutualFundsApi.applications().catch(() => null),
        mutualFundsApi.application(type ?? issueType).catch(() => null),
        mutualFundsApi.health().catch(() => null),
      ])
      setAppsSummary(summary)
      if (app) setPipeline(app)
      setHealth(healthRes)
    } catch {
      setSebonError("Failed to load SEBON pipeline data")
    } finally {
      setIsSebonLoading(false)
    }
  }

  useEffect(() => {
    if (tab === "pipeline") {
      void loadSebon(issueType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const appliedIpoKeys = useMemo(() => {
    const keys = new Set<string>()
    ;(userProfile?.meroShare?.applicationLogs ?? []).forEach((log) => {
      if (log.action === "apply" && log.status === "success") {
        keys.add(normalizeIpoName(log.ipoName))
      }
    })
    return keys
  }, [userProfile?.meroShare?.applicationLogs])

  const sorted = useMemo(() => {
    const statusOrder: Record<string, number> = { open: 0, upcoming: 1, closed: 2 }
    return [...upcomingIPOs].sort((a, b) => {
      const rankDiff = (statusOrder[a.status ?? ""] ?? 3) - (statusOrder[b.status ?? ""] ?? 3)
      if (rankDiff !== 0) return rankDiff
      return parseSortableDate(a.openingDate || a.announcement_date) - parseSortableDate(b.openingDate || b.announcement_date)
    })
  }, [upcomingIPOs])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return sorted.filter((ipo) => {
      if (statusFilter !== "all" && ipo.status !== statusFilter) return false
      if (reservedOnly && !ipo.is_reserved_share && !ipo.reserved_for) return false
      if (!query) return true
      return (
        ipo.company.toLowerCase().includes(query) ||
        (ipo.reserved_for || "").toLowerCase().includes(query) ||
        (ipo.units || "").toLowerCase().includes(query)
      )
    })
  }, [sorted, statusFilter, reservedOnly, searchQuery])

  const grouped = useMemo(() => {
    const open = filtered.filter((i) => i.status === "open")
    const upcoming = filtered.filter((i) => i.status === "upcoming")
    const closed = filtered.filter((i) => i.status === "closed")
    return [
      { key: "open", title: "Open Now", subtitle: "Applications are live", items: open },
      { key: "upcoming", title: "Upcoming", subtitle: "Opening soon", items: upcoming },
      { key: "closed", title: "Recently Closed", subtitle: "Check your allotment", items: closed },
    ].filter((g) => g.items.length > 0)
  }, [filtered])

  const openCount = upcomingIPOs.filter((i) => i.status === "open").length
  const upcomingCount = upcomingIPOs.filter((i) => i.status === "upcoming").length
  const closedCount = upcomingIPOs.filter((i) => i.status === "closed").length

  const openDetail = (ipo: UpcomingIPO) => {
    setSelectedIpo(ipo)
    setIsIpoDetailOpen(true)
  }

  const isApplied = (ipo: UpcomingIPO) => appliedIpoKeys.has(normalizeIpoName(ipo.company))

  const sectors = useMemo(() => {
    if (!pipeline?.records) return []
    return Array.from(new Set(pipeline.records.map((r) => r.sector).filter(Boolean))).sort()
  }, [pipeline])

  const pipelineFiltered = useMemo(() => {
    if (!pipeline?.records) return []
    const query = pipelineSearch.trim().toLowerCase()
    let list = pipeline.records.filter((r) => {
      if (pipelineSector !== "all" && r.sector !== pipelineSector) return false
      if (!query) return true
      return (
        r.company.toLowerCase().includes(query) ||
        (r.issue_manager || "").toLowerCase().includes(query) ||
        (r.sector || "").toLowerCase().includes(query)
      )
    })
    if (categoryFilter !== "all") {
      const want = categoryFilter === "local" ? "Local" : "General"
      list = list.filter((r) => ipoCategoryBadges(r.company, r.issue_type).includes(want))
    }
    if (premiumFilter !== "all") {
      const wantPremium = premiumFilter === "premium"
      list = list.filter((r) => isPremiumRecord(r) === wantPremium)
    }
    switch (sortBy) {
      case "amount-desc":
        list = [...list].sort((a, b) => (b.amount || 0) - (a.amount || 0))
        break
      case "amount-asc":
        list = [...list].sort((a, b) => (a.amount || 0) - (b.amount || 0))
        break
      case "units-desc":
        list = [...list].sort((a, b) => (b.units || 0) - (a.units || 0))
        break
      case "date-desc":
        list = [...list].sort((a, b) => String(b.date_application || "").localeCompare(String(a.date_application || "")))
        break
      case "company":
        list = [...list].sort((a, b) => shortCompany(a.company).localeCompare(shortCompany(b.company)))
        break
    }
    return list
  }, [pipeline, pipelineSearch, pipelineSector, categoryFilter, premiumFilter, sortBy])

  const pipelineBySector = useMemo(() => {
    const map = new Map<string, typeof pipelineFiltered>()
    pipelineFiltered.forEach((r) => {
      const key = r.sector || "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [pipelineFiltered])

  const switchIssueType = (type: ApplicationIssueType) => {
    setIssueType(type)
    setPipeline(null)
    setPipelineSector("all")
    setPipelineSearch("")
    setCategoryFilter("all")
    setPremiumFilter("all")
    setSortBy("default")
    void loadSebon(type)
  }

  const pipelineTotal = useMemo(() => (pipeline?.records ?? []).reduce((s, r) => s + (r.amount || 0), 0), [pipeline])

  const stats = useMemo(() => {
    if (tab === "pipeline") {
      return [
        { label: "Applications", value: pipeline?.count ?? "—", tone: "text-primary", icon: Database },
        { label: "Total amount", value: pipeline ? compactAmount(pipelineTotal, calendarSystem) : "—", tone: "text-success", icon: Sparkles },
        { label: "Issue types", value: appsSummary?.types.length ?? "—", tone: "text-info", icon: FileText },
        { label: "Sectors", value: sectors.length || "—", tone: "text-warning", icon: Building2 },
      ]
    }
    return [
      { label: "Open", value: openCount, tone: "text-success", icon: CheckCircle2 },
      { label: "Upcoming", value: upcomingCount, tone: "text-info", icon: Clock },
      { label: "Closed", value: closedCount, tone: "text-muted-foreground", icon: Landmark },
      { label: "SEBON", value: appsSummary?.total ?? "—", tone: "text-primary", icon: Database },
    ]
  }, [tab, pipeline, pipelineTotal, appsSummary, sectors, openCount, upcomingCount, closedCount, calendarSystem])

  const renderLiveItem = (ipo: UpcomingIPO) => {
    const meta = STATUS_META[ipo.status ?? "closed"] ?? STATUS_META.closed
    const StatusIcon = meta.icon
    return (
      <button
        key={`${ipo.company}-${ipo.date_range}-${ipo.status ?? "unknown"}`}
        type="button"
        onClick={() => openDetail(ipo)}
        className="group relative w-full flex items-center gap-3 overflow-hidden rounded-2xl border border-border/30 bg-card/60 p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
      >
        <span className={cn("absolute left-0 top-0 bottom-0 w-1", meta.dot)} />
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 pl-1.5">
          <p className="text-[13px] font-black leading-snug truncate">{ipo.company}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">{ipo.date_range}</span>
            {ipo.units && <span className="shrink-0">· {ipo.units} units</span>}
          </p>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Badge className={cn("text-[8px] h-4 px-1.5 font-bold border", meta.className)}>
              <StatusIcon className="w-2.5 h-2.5 mr-1" />
              {meta.label}
            </Badge>
            {ipo.status !== "closed" && ipo.daysRemaining !== undefined && (
              <span className="text-[10px] font-bold text-primary">
                {ipo.status === "open" ? "Closes in" : "Opens in"} {ipo.daysRemaining}d
              </span>
            )}
            {ipo.is_reserved_share && (
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-bold border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                Reserved
              </Badge>
            )}
            {isApplied(ipo) && (
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-bold border-success/30 bg-success/10 text-success">
                Applied
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </button>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* ── Header hero ─────────────────────────────────── */}
      <div className="relative text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <Rocket className="h-4.5 w-4.5" />
              </div>
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[9px] uppercase tracking-[0.2em] px-2">
                IPO Center
              </Badge>
            </div>
            <h1 className="mt-2 text-lg sm:text-xl font-black tracking-tight">IPO &amp; Rights</h1>
            <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">
              Live issues &amp; the SEBON application pipeline.
              {health && (
                <span className={cn("ml-1.5 inline-flex items-center gap-1 font-bold", health.status === "ok" ? "text-success" : "text-error")}>
                  <Activity className="h-2.5 w-2.5" /> API {health.status}
                </span>
              )}
            </p>
          </div>
          {isSebonLoading || isIPOsLoading ? (
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0" disabled aria-label="Loading">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0 bg-background/60"
              aria-label="Refresh"
              onClick={() => {
                void refreshMarketData()
                if (tab !== "live") void loadSebon(issueType)
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stat strip */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <StatBox key={s.label} label={s.label} value={s.value} tone={s.tone} icon={s.icon} />
          ))}
        </div>

        {/* Tab bar */}
        <div className="mt-3 flex w-fit gap-1 rounded-xl border border-border/40 bg-muted/50 p-1">
          {TAB_DEFS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all active:scale-[0.97]",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      {tab === "live" ? (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies…"
                className="h-11 pl-9 pr-8 rounded-2xl text-sm font-bold bg-card/60 border-border/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={cn("h-11 w-11 rounded-2xl shrink-0", reservedOnly && "border-primary/40 bg-primary/10 text-primary")}
              aria-label="Reserved only"
              title="Reserved only"
              onClick={() => setReservedOnly((v) => !v)}
            >
              <AlertCircle className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["all", "open", "upcoming", "closed"] as StatusFilter[]).map((s) => {
              const active = statusFilter === s
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-95",
                    active ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 bg-card/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "all" ? "All" : STATUS_META[s].label}
                </button>
              )
            })}
          </div>

          {isIPOsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-[92px] rounded-2xl bg-muted/20 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyCard
              icon={Rocket}
              title={searchQuery || statusFilter !== "all" || reservedOnly ? "No matching offerings" : "No IPO data yet"}
              subtitle="Pull to refresh or check back later"
            />
          ) : (
            <div className="space-y-5">
              {grouped.map((group) => (
                <section key={group.key}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_META[group.key].dot)} />
                      <h3 className="text-sm font-black">{group.title}</h3>
                      <span className="text-[10px] text-muted-foreground">{group.subtitle}</span>
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-5 px-2 font-bold">{group.items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {group.items.map(renderLiveItem)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : tab === "applications" ? (
        <MyApplicationsTab />
      ) : (
        <PipelineTab
          isLoading={isSebonLoading}
          error={sebonError}
          pipeline={pipeline}
          bySector={pipelineBySector}
          allSectors={sectors}
          sector={pipelineSector}
          onSectorChange={setPipelineSector}
          query={pipelineSearch}
          onQueryChange={setPipelineSearch}
          category={categoryFilter}
          onCategoryChange={setCategoryFilter}
          premium={premiumFilter}
          onPremiumChange={setPremiumFilter}
          sort={sortBy}
          onSortChange={setSortBy}
          appsSummary={appsSummary}
          issueType={issueType}
          onIssueTypeChange={switchIssueType}
          onRetry={() => loadSebon(issueType)}
        />
      )}

      <IPODetailModal ipo={selectedIpo} open={isIpoDetailOpen} onOpenChange={setIsIpoDetailOpen} />
    </div>
  )
}

/* ── Pipeline ─────────────────────────────────────────── */
function PipelineTab({ isLoading, error, pipeline, bySector, allSectors, sector, onSectorChange, query, onQueryChange, category, onCategoryChange, premium, onPremiumChange, sort, onSortChange, appsSummary, issueType, onIssueTypeChange, onRetry }: {
  isLoading: boolean
  error: string | null
  pipeline: ApplicationPipeline | null
  bySector: Array<[string, ApplicationPipeline["records"]]>
  allSectors: string[]
  sector: string
  onSectorChange: (v: string) => void
  query: string
  onQueryChange: (v: string) => void
  category: "all" | "general" | "local"
  onCategoryChange: (v: "all" | "general" | "local") => void
  premium: "all" | "premium" | "normal"
  onPremiumChange: (v: "all" | "premium" | "normal") => void
  sort: "default" | "amount-desc" | "amount-asc" | "units-desc" | "date-desc" | "company"
  onSortChange: (v: "default" | "amount-desc" | "amount-asc" | "units-desc" | "date-desc" | "company") => void
  appsSummary: ApplicationsSummary | null
  issueType: ApplicationIssueType
  onIssueTypeChange: (t: ApplicationIssueType) => void
  onRetry: () => void
}) {
  const [closedSectors, setClosedSectors] = useState<Set<string>>(new Set())
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null)
  const calendarSystem = useCalendarSystem()

  const toggleSector = (key: string) => {
    setClosedSectors((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (isLoading && !pipeline) {
    return (
      <div className="space-y-3 animate-in fade-in-50">
        <div className="h-8 rounded-lg bg-muted/20 animate-pulse" />
        <div className="h-11 rounded-2xl bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted/10 animate-pulse" />)}
        </div>
      </div>
    )
  }
  if (error && !pipeline) return <ErrorCard message={error} onRetry={onRetry} />
  if (!pipeline || pipeline.records.length === 0) {
    return <EmptyCard icon={ClipboardList} title="No applications recorded" subtitle="SEBON has not published a pipeline for this issue type yet" />
  }

  const filteredCount = bySector.reduce((s, [, records]) => s + records.length, 0)

  return (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      {/* Status row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {pipeline.label} · Proposed{pipeline.fiscal_year ? ` · FY ${pipeline.fiscal_year}` : ""}
        </p>
        {pipeline.as_of_bs && (
          <p className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Calendar className="h-3 w-3" /> As of {formatBsDate(pipeline.as_of_bs)}
          </p>
        )}
      </div>

      {/* Issue type pills */}
      {appsSummary && appsSummary.types.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {appsSummary.types.map((t) => {
            const active = issueType === t
            const count = appsSummary.counts?.[t] ?? 0
            return (
              <button
                key={t}
                onClick={() => onIssueTypeChange(t)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all active:scale-95",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                    : "border-border/40 bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {ISSUE_TYPE_LABEL[t]}
                <span className={cn("rounded-full px-1.5 text-[9px] font-black", active ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground")}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search company, sector or manager…"
            className="h-11 pl-10 pr-9 rounded-2xl text-sm font-bold bg-card/60 border-border/40"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto min-w-0 max-w-[55%] pb-0.5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border/40 bg-muted/40 p-1">
            {([
              { value: "all" as const, label: "All" },
              { value: "general" as const, label: "General" },
              { value: "local" as const, label: "Local" },
            ]).map((o) => (
              <button
                key={o.value}
                onClick={() => onCategoryChange(o.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all active:scale-95",
                  category === o.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border/40 bg-muted/40 p-1">
            {([
              { value: "all" as const, label: "All" },
              { value: "premium" as const, label: "Premium" },
              { value: "normal" as const, label: "Standard" },
            ]).map((o) => (
              <button
                key={o.value}
                onClick={() => onPremiumChange(o.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all active:scale-95",
                  premium === o.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <label className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border/40 bg-muted/40 px-2.5 py-1.5">
            <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as typeof sort)}
              className="bg-transparent text-[10px] font-bold outline-none [&>option]:bg-background [&>option]:text-foreground"
            >
              <option value="default">Default order</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="units-desc">Most units</option>
              <option value="date-desc">Newest applied</option>
              <option value="company">Company A–Z</option>
            </select>
          </label>
        </div>
      </div>

      {/* Sector chips */}
      {allSectors.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => onSectorChange("all")}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[10px] font-bold transition-all active:scale-95",
              sector === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 bg-card/50 text-muted-foreground hover:text-foreground",
            )}
          >
            All sectors
          </button>
          {allSectors.map((s) => {
            const c = sectorColor(s)
            const active = sector === s
            return (
              <button
                key={s}
                onClick={() => onSectorChange(active ? "all" : s)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[10px] font-bold transition-all active:scale-95",
                  active ? c.chip : "border-border/40 bg-card/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            )
          })}
        </div>
      )}

      {/* Count */}
      <p className="px-1 text-xs font-bold text-muted-foreground">
        {filteredCount} application{filteredCount !== 1 ? "s" : ""}
        {query && <span className="text-muted-foreground/60"> · matching “{query}”</span>}
      </p>

      {/* Collapsible sections by sector */}
      {bySector.length === 0 ? (
        <EmptyCard icon={Search} title="No matching applications" subtitle="Try a different search or sector" />
      ) : sector !== "all" ? (
        <div className="space-y-2">
          {bySector.flatMap(([, records]) => records).map((r) => (
            <PipelineItemCard key={`${r.sn}-${r.company}`} r={r} onSelect={setSelectedApp} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {bySector.map(([sectorName, records]) => {
            const c = sectorColor(sectorName)
            const isOpen = !closedSectors.has(sectorName)
            const sectorTotal = records.reduce((s, r) => s + (r.amount || 0), 0)
            return (
              <div
                key={sectorName}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-colors text-left",
                  isOpen ? "border-primary/25 bg-card/70" : "border-border/30 bg-card/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSector(sectorName)}
                  className="w-full flex items-center justify-between gap-2 p-3.5 text-left active:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", c.bg, c.text)}>
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{sectorName}</p>
                      <p className="text-[9px] text-muted-foreground/70 truncate">{compactAmount(sectorTotal, calendarSystem)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[9px] h-5 px-2 font-bold">{records.length}</Badge>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/10 pt-2.5">
                    {records.map((r) => (
                      <PipelineItemCard key={`${r.sn}-${r.company}`} r={r} onSelect={setSelectedApp} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 text-center px-4">
        Companies that have applied to SEBON for a public issue but are not yet approved, parsed from each instrument&apos;s official application-list PDF. Tap any company for full details.
      </p>

      <ApplicationDetailModal
        app={selectedApp}
        sourcePdf={pipeline.source_pdf}
        open={selectedApp !== null}
        onOpenChange={(open) => { if (!open) setSelectedApp(null) }}
      />
    </div>
  )
}


/* ── Pipeline item card ───────────────────────────────── */
function PipelineItemCard({ r, onSelect }: {
  r: ApplicationRecord
  onSelect: (r: ApplicationRecord) => void
}) {
  const calendarSystem = useCalendarSystem()
  const c = sectorColor(r.sector || "Other")
  const premium = isPremiumRecord(r)
  return (
    <button
      type="button"
      onClick={() => onSelect(r)}
      className="group w-full flex items-center gap-3 rounded-2xl border border-border/30 bg-card/60 p-3.5 text-left transition-all hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black text-[10px]", c.bg, c.text)}>
        {appInitials(r.company)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-black leading-snug truncate">{shortCompany(r.company)}</p>
          {premium && (
            <Badge className="text-[8px] h-4 px-1.5 font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              Premium
            </Badge>
          )}
          {ipoCategoryBadges(r.company, r.issue_type).map((b) => (
            <Badge
              key={b}
              variant="outline"
              className={cn("text-[8px] h-4 px-1.5 font-bold border", categoryBadgeClass(b))}
            >
              {b}
            </Badge>
          ))}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {r.date_application ? `Applied ${formatBsDate(r.date_application)}` : r.issue_manager || "SEBON application"}
          </span>
        </p>
        <p className="mt-1 flex items-baseline gap-1.5 sm:hidden">
          <span className="text-xs font-black font-mono text-primary">{compactAmount(r.amount, calendarSystem)}</span>
          <span className="text-[9px] font-bold text-muted-foreground/70">{formatMoney(r.units)} units</span>
        </p>
      </div>
      <div className="hidden sm:block text-right shrink-0">
        <p className="text-xs font-black font-mono text-primary">{compactAmount(r.amount, calendarSystem)}</p>
        <p className="text-[8px] text-muted-foreground/70">{formatMoney(r.units)} units</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </button>
  )
}


/* ── Application detail modal ─────────────────────────── */
function ApplicationDetailModal({ app, sourcePdf, open, onOpenChange }: {
  app: ApplicationRecord | null
  sourcePdf?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const calendarSystem = useCalendarSystem()
  const [previewOpen, setPreviewOpen] = useState(false)

  const proxyPdfUrl = sourcePdf ? `/api/sebon-pdf?url=${encodeURIComponent(sourcePdf)}` : null

  if (!app) return null

  const premium = isPremiumRecord(app)
  const issueLabel = app.issue_type
    ? (ISSUE_TYPE_LABEL[app.issue_type.toLowerCase().split(" (")[0] as ApplicationIssueType] ?? app.issue_type.split(" (")[0])
    : null

  const shortRows: Array<{ label: string; value?: string | number | null; mono?: boolean; highlight?: boolean }> = [
    { label: "Units", value: app.units, mono: true, highlight: true },
    { label: "Amount", value: compactAmount(app.amount, calendarSystem), mono: true, highlight: true },
    { label: "Public units", value: app.public_units, mono: true },
    { label: "Private units", value: app.private_units, mono: true },
    { label: "Rate / unit", value: app.rate ?? (app.units && app.amount ? `रु ${Math.round(app.amount / app.units)} / unit` : null), mono: true },
    { label: "Ratio", value: app.ratio, mono: true },
    { label: "Issue manager", value: app.issue_manager },
    { label: "Applied (BS)", value: formatBsDate(app.date_application) },
    { label: "Fund", value: app.fund_name },
    { label: "Status", value: app.status },
  ]

  const openPdfPreview = () => {
    if (sourcePdf) setPreviewOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl p-0 overflow-hidden max-h-[85vh] sm:max-h-[90vh]">
        <div className="p-5 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight leading-tight pr-6">
              {shortCompany(app.company)}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {app.sector && (
              <Badge variant="secondary" className="text-[9px] h-5 px-2 font-bold">{app.sector}</Badge>
            )}
            {issueLabel && (
              <Badge variant="outline" className="text-[9px] h-5 px-2 font-bold text-primary">{issueLabel}</Badge>
            )}
            {ipoCategoryBadges(app.company, app.issue_type).map((b) => (
              <Badge key={b} variant="outline" className={cn("text-[9px] h-5 px-2 font-bold border", categoryBadgeClass(b))}>
                {b}
              </Badge>
            ))}
            {premium && (
              <Badge className="text-[9px] h-5 px-2 font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">Premium</Badge>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {shortRows.filter((r) => r.value != null && r.value !== "").map((r) => (
              <div key={r.label} className="rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">{r.label}</p>
                <p className={cn("mt-0.5 text-sm font-black truncate", r.mono && "font-mono", r.highlight && "text-primary")}>{r.value}</p>
              </div>
            ))}
          </div>

          {app.remarks && (
            <div className="mt-2.5 rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">Remarks</p>
              <p className="mt-0.5 text-xs font-medium leading-relaxed break-words text-muted-foreground">{app.remarks}</p>
            </div>
          )}

          {sourcePdf && (
            <Button
              type="button"
              variant="outline"
              onClick={openPdfPreview}
              className="mt-4 w-full h-10 rounded-xl text-xs font-black"
            >
              <FileText className="h-4 w-4" />
              View official SEBON PDF
            </Button>
          )}
        </div>
      </DialogContent>
      </Dialog>
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={proxyPdfUrl}
        sourceUrl={sourcePdf ?? null}
        title={`${shortCompany(app.company)} · SEBON PDF`}
      />
    </>
  )
}


/* ── Shared bits ──────────────────────────────────────── */
function StatBox({ label, value, tone, icon: Icon }: { label: string; value: number | string; tone?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border/30 bg-background/50 px-2 py-2.5 text-center backdrop-blur-sm">
      <Icon className={cn("mx-auto mb-1 h-3.5 w-3.5", tone ?? "text-muted-foreground")} />
      <p className={cn("text-lg font-black font-mono leading-none", tone ?? "text-foreground")}>{value}</p>
      <p className="mt-1 text-[8px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
    </div>
  )
}

function EmptyCard({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/40 bg-card/40 py-16 px-6 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-black text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground/70">{subtitle}</p>
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-destructive/30 bg-card/40 py-16 px-6 text-center gap-3">
      <p className="text-sm text-destructive font-medium">{message}</p>
      <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs" onClick={onRetry}>Retry</Button>
    </div>
  )
}
