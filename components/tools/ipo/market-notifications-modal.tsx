"use client"

import { useEffect, useMemo, useState } from "react"
import { Megaphone, Search, FileText, Calendar, Loader2, RefreshCw, Activity, BellRing, Info, ArrowUpRight, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal"
import { cn } from "@/lib/utils"
import {
  mutualFundsApi,
  type SebonNotices,
  type SebonNotice,
} from "@/lib/mutual-funds"

const PREVIEW_LIMIT = 8

export type MarketAlertItem = {
  id: string
  category: string
  title: string
  text: string
  tone: "info" | "warning" | "success"
  dateLabel: string
  documents: Array<{ label: string; url: string }>
  actionLabel: string
}

type FamilyInfo = {
  family: string
  label: string
  kind: "dual" | "single"
  approved?: string
  application?: string
  single?: string
  count: number
}

function formatBsDate(value?: string) {
  if (!value) return "—"
  const parts = String(value).split("/")
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]} BS`
  return value
}

export function MarketNotificationsModal({
  open,
  onOpenChange,
  marketAlerts = [],
  onOpenMarketAlert,
  onPreviewDocument,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  marketAlerts?: MarketAlertItem[]
  onOpenMarketAlert?: (id: string) => void
  onPreviewDocument?: (url: string) => void
}) {
  const [notices, setNotices] = useState<SebonNotices | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [family, setFamily] = useState<string>("all")
  const [sub, setSub] = useState<"approved" | "application">("approved")
  const [listModal, setListModal] = useState<{ title: string; items: SebonNotice[] } | null>(null)
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState<{ url: string; sourceUrl: string; title: string } | null>(null)
  const [marketFilter, setMarketFilter] = useState<string>("all")

  const marketCategories = useMemo(() => {
    const counts = marketAlerts.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1
      return acc
    }, {})
    return { all: marketAlerts.length, ...counts } as Record<string, number>
  }, [marketAlerts])

  const filteredMarketAlerts = useMemo(
    () => (marketFilter === "all" ? marketAlerts : marketAlerts.filter((item) => item.category === marketFilter)),
    [marketAlerts, marketFilter],
  )

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await mutualFundsApi.sebonNotices()
      setNotices(res)
    } catch {
      setError("Failed to load SEBON circulars")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const families = useMemo<FamilyInfo[]>(() => {
    if (!notices?.families) return []
    return notices.families.map((f) => {
      if ("approved" in f) {
        return {
          family: f.family,
          label: f.label,
          kind: "dual" as const,
          approved: f.approved,
          application: f.application,
          count: (notices.counts[f.approved] ?? 0) + (notices.counts[f.application] ?? 0),
        }
      }
      return { family: f.family, label: f.label, kind: "single" as const, single: f.single, count: notices.counts[f.single] ?? 0 }
    })
  }, [notices])

  const selectedFam = useMemo(() => families.find((f) => f.family === family) ?? null, [families, family])

  const activeLabel = useMemo(() => {
    if (!selectedFam) return "All notices"
    if (selectedFam.kind === "dual") return `${selectedFam.label} · ${sub === "application" ? "Application" : "Approved"}`
    return selectedFam.label
  }, [selectedFam, sub])

  const activeItems = useMemo<SebonNotice[]>(() => {
    if (!notices) return []
    if (!selectedFam) return Object.values(notices.categories).flat()
    const key = selectedFam.kind === "dual" ? (sub === "application" ? selectedFam.application : selectedFam.approved) : selectedFam.single
    return notices.categories[key ?? ""] ?? []
  }, [notices, selectedFam, sub])

  const sortedItems = useMemo(() => {
    return [...activeItems].sort(
      (a, b) => (b.ad_date ?? "").localeCompare(a.ad_date ?? "") || (b.bs_date ?? "").localeCompare(a.bs_date ?? "")
    )
  }, [activeItems])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return listModal?.items ?? []
    return (listModal?.items ?? []).filter((n) =>
      (n.title ?? "").toLowerCase().includes(q) ||
      (n.ad_date ?? "").includes(q) ||
      (n.bs_date ?? "").includes(q)
    )
  }, [listModal, query])

  const openDoc = (url: string, lang: string) =>
    setPreview({ url: `/api/sebon-pdf?url=${encodeURIComponent(url)}`, sourceUrl: url, title: `${activeLabel} · ${lang}` })

  const pillClass = (active: boolean) =>
    cn(
      "shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap",
      active ? "border-primary/25 bg-primary/10 text-primary" : "border-border/30 bg-card/60 text-muted-foreground"
    )

  const total = notices?.total ?? 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl p-0 overflow-hidden h-[88dvh] sm:h-[80vh] w-[calc(100%-1rem)] sm:w-full flex flex-col">
          <div className="p-4 sm:p-5 pb-3 shrink-0">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <Megaphone className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-black tracking-tight leading-tight pr-6">
                    Market Notifications
                  </DialogTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    Market alerts & official circulars
                    {marketAlerts.length > 0 && (
                      <span className="inline-flex items-center gap-1 font-bold text-primary whitespace-nowrap">
                        <BellRing className="h-2.5 w-2.5" /> {marketAlerts.length} alerts
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-3 sm:px-5 pb-4 sm:pb-5 flex flex-col min-h-0 flex-1">
            <Tabs defaultValue={marketAlerts.length > 0 ? "market" : "sebon"} className="w-full flex flex-col min-h-0 flex-1">
              <TabsList className="mb-4 w-full grid grid-cols-2 shrink-0">
                <TabsTrigger value="market" className="flex-1">Market Alerts</TabsTrigger>
                <TabsTrigger value="sebon" className="flex-1">SEBON Notices</TabsTrigger>
              </TabsList>

              <TabsContent value="market" className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-2">
                {marketAlerts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-muted/50 bg-muted/10 px-3 py-6 text-center">
                    <p className="text-xs font-semibold text-muted-foreground">No market alerts right now.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {Object.keys(marketCategories).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMarketFilter(cat)}
                          className={pillClass(marketFilter === cat)}
                        >
                          {cat === "all" ? <Megaphone className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                          {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                          <span className="font-mono text-[10px] opacity-70">{marketCategories[cat]}</span>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {filteredMarketAlerts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-muted/50 bg-muted/10 px-3 py-6 text-center">
                          <p className="text-xs font-semibold text-muted-foreground">No alerts in this category.</p>
                        </div>
                      ) : (
                        filteredMarketAlerts.map((item) => (
                          <MarketAlertRow
                            key={item.id}
                            item={item}
                            onOpen={() => onOpenMarketAlert?.(item.id)}
                            onPreviewDocument={onPreviewDocument}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="sebon" className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-3">
                {isLoading && !notices ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl bg-muted/20 animate-pulse" />)}
                  </div>
                ) : error && !notices ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <p className="text-sm text-destructive font-medium">{error}</p>
                    <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs" onClick={() => void load()}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
                    </Button>
                  </div>
                ) : !notices ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-xs text-muted-foreground">No circulars available</p>
                  </div>
                ) : (
                  <SebonNoticesPanel
                    isLoading={isLoading}
                    family={family}
                    setFamily={setFamily}
                    families={families}
                    selectedFam={selectedFam}
                    sub={sub}
                    setSub={setSub}
                    notices={notices}
                    sortedItems={sortedItems}
                    openDoc={openDoc}
                    pillClass={pillClass}
                    setListModal={setListModal}
                    setQuery={setQuery}
                    total={total}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={listModal !== null} onOpenChange={(o) => { if (!o) { setListModal(null); setQuery("") } }}>
        <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl p-0 overflow-hidden max-h-[85vh] sm:max-h-[90vh] w-[calc(100%-1rem)] sm:w-full">
          <div className="p-4 sm:p-5 pb-2">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight leading-tight pr-6">{listModal?.title}</DialogTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">{listModal?.items.length} notices · newest first</p>
            </DialogHeader>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or date…"
                className="pl-9 h-9 rounded-xl text-xs"
              />
            </div>
          </div>
          <div className="px-4 sm:px-5 pb-5 space-y-2 overflow-y-auto max-h-[55vh]">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No matching notices</p>
            ) : (
              filtered.map((n, i) => <NoticeRow key={`${activeLabel}-${i}-${n.ad_date ?? n.title}`} notice={n} onOpenDoc={openDoc} />)
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DocumentPreviewModal
        open={preview !== null}
        onOpenChange={(o) => { if (!o) setPreview(null) }}
        url={preview?.url ?? null}
        sourceUrl={preview?.sourceUrl ?? null}
        title={preview?.title ?? "SEBON Notice"}
      />
    </>
  )
}

function SebonLoadingPanel({ isLoading }: { isLoading: boolean }) {
  return isLoading ? (
    <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
    </p>
  ) : null
}

function SebonNoticesPanel({
  isLoading,
  family,
  setFamily,
  families,
  selectedFam,
  sub,
  setSub,
  notices,
  sortedItems,
  openDoc,
  pillClass,
  setListModal,
  setQuery,
  total,
}: {
  isLoading: boolean
  family: string
  setFamily: (f: string) => void
  families: FamilyInfo[]
  selectedFam: FamilyInfo | null
  sub: "approved" | "application"
  setSub: (s: "approved" | "application") => void
  notices: SebonNotices
  sortedItems: SebonNotice[]
  openDoc: (url: string, lang: string) => void
  pillClass: (active: boolean) => string
  setListModal: (v: { title: string; items: SebonNotice[] }) => void
  setQuery: (q: string) => void
  total: number
}) {
  const [showAllFam, setShowAllFam] = useState(false)
  const visibleFamilies = showAllFam ? families.filter((f) => f.count > 0) : families.filter((f) => f.count > 0).slice(0, 4)

  return (
    <>
      {isLoading && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => setFamily("all")} className={pillClass(family === "all")}>
          <Megaphone className="h-3.5 w-3.5" />
          All
          <span className="font-mono text-[10px] opacity-70">{total}</span>
        </button>
        {visibleFamilies.map((f) => (
          <button key={f.family} type="button" onClick={() => setFamily(f.family)} className={pillClass(family === f.family)}>
            <FileText className="h-3.5 w-3.5" />
            {f.label}
            <span className="font-mono text-[10px] opacity-70">{f.count}</span>
          </button>
        ))}
        {families.filter((f) => f.count > 0).length > 4 && (
          <button
            type="button"
            onClick={() => setShowAllFam((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-card/60 px-2.5 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            {showAllFam ? <><ChevronUp className="h-3.5 w-3.5" /> Less</> : <><ChevronDown className="h-3.5 w-3.5" /> More</>}
          </button>
        )}
      </div>

      {selectedFam?.kind === "dual" && (
        <div className="grid grid-cols-2 gap-2">
          {(["approved", "application"] as const).map((s) => {
            const key = s === "approved" ? selectedFam.approved! : selectedFam.application!
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSub(s)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                  sub === s ? "border-primary/25 bg-primary/10 text-primary" : "border-border/30 bg-card/60 text-muted-foreground"
                )}
              >
                {s === "approved" ? "Approved" : "Application"}
                <span className="font-mono text-[10px] opacity-70">{notices.counts[key] ?? 0}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        {sortedItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No circulars in this selection.</p>
        ) : (
          <>
            {sortedItems.slice(0, PREVIEW_LIMIT).map((n, i) => (
              <NoticeRow key={`${selectedFam?.family}-${i}-${n.ad_date ?? n.title}`} notice={n} onOpenDoc={openDoc} />
            ))}
            {sortedItems.length > PREVIEW_LIMIT && (
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl text-xs font-black"
                onClick={() => { setQuery(""); setListModal({ title: selectedFam?.label ?? "All notices", items: sortedItems }) }}
              >
                View all {sortedItems.length} notices
              </Button>
            )}
          </>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center px-1 pt-1">
        Approved = cleared, Application = applied but not yet approved. Tap EN/NP to view official documents.
      </p>
    </>
  )
}

function MarketAlertRow({
  item,
  onOpen,
  onPreviewDocument,
}: {
  item: MarketAlertItem
  onOpen: () => void
  onPreviewDocument?: (url: string) => void
}) {
  const icon = (() => {
    if (item.category === "ipo") return <Megaphone className="w-4 h-4" />
    if (item.category === "disclosure") return <FileText className="w-4 h-4" />
    if (item.category === "exchange") return <Activity className="w-4 h-4" />
    if (item.category === "sip") return <Calendar className="w-4 h-4" />
    return <Info className="w-4 h-4" />
  })()

  return (
    <div
      className={cn(
        "group rounded-xl border px-3 py-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30",
        item.tone === "info" && "border-info/20 bg-info/5",
        item.tone === "warning" && "border-amber-500/20 bg-amber-500/5",
        item.tone === "success" && "border-success/20 bg-success/5",
      )}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-2.5 sm:gap-3">
          <div className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-105",
            item.tone === "info" && "border-info/20 bg-info/10 text-info",
            item.tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-600",
            item.tone === "success" && "border-success/20 bg-success/10 text-success",
          )}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{item.title}</p>
              {item.documents.length > 0 && (
                <span className="rounded-md h-4 inline-flex items-center border px-1 text-[8px] font-black uppercase text-muted-foreground">
                  {item.documents.length} Doc
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground/90 line-clamp-3 truncate">{item.text}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {item.dateLabel}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 shrink-0 rounded-md bg-muted/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          {item.category}
        </span>
      </div>
      <div
        className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-current/10 pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        {item.documents.length > 0 && onPreviewDocument && (
          item.documents.map((doc, i) => (
            <Button
              key={i}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 max-w-[9rem] rounded-md px-2 text-[10px] font-black uppercase tracking-wider"
              onClick={() => onPreviewDocument(doc.url)}
              title={doc.label}
            >
              <FileText className="mr-1.5 w-3 h-3 shrink-0" />
              <span className="truncate">{doc.label}</span>
            </Button>
          ))
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-md px-2 text-[10px] font-black uppercase tracking-wider"
          onClick={onOpen}
        >
          <span className="truncate">{item.actionLabel}</span>
          <ArrowUpRight className="ml-1.5 w-3 h-3 shrink-0" />
        </Button>
      </div>
    </div>
  )
}

function NoticeRow({ notice, onOpenDoc }: { notice: SebonNotice; onOpenDoc: (url: string, lang: string) => void }) {
  const enUrl = notice.english_url
  const npUrl = notice.nepali_url
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-bold leading-snug line-clamp-2">{notice.title}</p>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
          {notice.bs_date && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatBsDate(notice.bs_date)}</span>}
          {notice.ad_date && <span>· {notice.ad_date}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {enUrl && (
          <button
            type="button"
            onClick={() => onOpenDoc(enUrl, "EN")}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg"
          >
            <FileText className="w-3 h-3" /> EN
          </button>
        )}
        {npUrl && (
          <button
            type="button"
            onClick={() => onOpenDoc(npUrl, "NP")}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg"
          >
            <FileText className="w-3 h-3" /> NP
          </button>
        )}
      </div>
    </div>
  )
}