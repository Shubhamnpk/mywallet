"use client"

import { useEffect, useMemo, useState } from "react"
import { Megaphone, Search, FileText, Calendar, Loader2, RefreshCw, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DocumentPreviewModal } from "@/components/ui/document-preview-modal"
import { cn } from "@/lib/utils"
import {
  mutualFundsApi,
  type SebonNotices,
  type SebonNotice,
} from "@/lib/mutual-funds"

const PREVIEW_LIMIT = 8

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

export function SebonNoticesModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [notices, setNotices] = useState<SebonNotices | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [family, setFamily] = useState<string>("all")
  const [sub, setSub] = useState<"approved" | "application">("approved")
  const [listModal, setListModal] = useState<{ title: string; items: SebonNotice[] } | null>(null)
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState<{ url: string; sourceUrl: string; title: string } | null>(null)

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
      "shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
      active ? "border-primary/25 bg-primary/10 text-primary" : "border-border/30 bg-card/60 text-muted-foreground"
    )

  const total = notices?.total ?? 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl p-0 overflow-hidden max-h-[88vh] sm:max-h-[92vh]">
          <div className="p-5 pb-3">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Megaphone className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-black tracking-tight leading-tight pr-6">
                    SEBON Market Notices
                  </DialogTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    {notices?.source ?? "Official circulars from SEBON"}
                    <span className="inline-flex items-center gap-1 font-bold text-primary">
                      <Activity className="h-2.5 w-2.5" /> {total} total
                    </span>
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-5 pb-5 space-y-3 overflow-y-auto">
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
              <>
                {isLoading && (
                  <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
                  </p>
                )}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button type="button" onClick={() => setFamily("all")} className={pillClass(family === "all")}>
                    <Megaphone className="h-3.5 w-3.5" />
                    All
                    <span className="font-mono text-[10px] opacity-70">{sortedItems.length}</span>
                  </button>
                  {families.filter((f) => f.count > 0).map((f) => (
                    <button key={f.family} type="button" onClick={() => setFamily(f.family)} className={pillClass(family === f.family)}>
                      <FileText className="h-3.5 w-3.5" />
                      {f.label}
                      <span className="font-mono text-[10px] opacity-70">{f.count}</span>
                    </button>
                  ))}
                </div>

                {selectedFam?.kind === "dual" && (
                  <div className="flex items-center gap-1.5">
                    {(["approved", "application"] as const).map((s) => {
                      const key = s === "approved" ? selectedFam.approved! : selectedFam.application!
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSub(s)}
                          className={cn(
                            "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
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
                        <NoticeRow key={`${activeLabel}-${i}-${n.ad_date ?? n.title}`} notice={n} onOpenDoc={openDoc} />
                      ))}
                      {sortedItems.length > PREVIEW_LIMIT && (
                        <Button
                          variant="outline"
                          className="w-full h-11 rounded-xl text-xs font-black"
                          onClick={() => { setQuery(""); setListModal({ title: activeLabel, items: sortedItems }) }}
                        >
                          View all {sortedItems.length} notices
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground/60 text-center px-4 pt-1">
                  Approved = cleared, Application = applied but not yet approved. Tap EN/NP to view SEBON&apos;s official documents in the app.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={listModal !== null} onOpenChange={(o) => { if (!o) { setListModal(null); setQuery("") } }}>
        <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl p-0 overflow-hidden max-h-[85vh] sm:max-h-[90vh]">
          <div className="p-5 pb-2">
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
          <div className="px-5 pb-5 space-y-2 overflow-y-auto max-h-[55vh]">
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
      <div className="flex items-center gap-1.5 shrink-0">
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
