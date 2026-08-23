"use client"

import { useMemo, useState } from "react"
import { Heart, Sparkles, ExternalLink, Search, Package, Users } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  contributors,
  openSourcePackages,
  CONTRIBUTOR_CATEGORY_LABELS,
  CATEGORY_ORDER,
  getInitials,
} from "@/lib/contributors"

type ContributorsTributeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContributorsTributeModal({ open, onOpenChange }: ContributorsTributeModalProps) {
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"people" | "packages">("people")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contributors
    return contributors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    )
  }, [query])

  const filteredPackages = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return openSourcePackages
    return openSourcePackages.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q),
    )
  }, [query])

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: filtered.filter((c) => c.category === category),
      })).filter((group) => group.items.length > 0),
    [filtered],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[94vw] h-[85dvh] max-h-[85dvh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="relative shrink-0 border-b border-border/60 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 px-5 py-4 text-left space-y-1">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 ring-1 ring-primary/20">
              <Heart className="h-4 w-4 text-primary" />
            </span>
            The Helping Hands
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-relaxed">
            A tribute to everyone - seen and unseen - who helped MyWallet become what it is.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2.5 border-b border-border/60 px-5 pb-3 pt-3 bg-background">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab("people")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${tab === "people" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="h-3.5 w-3.5" />
              Helping Hands
            </button>
            <button
              type="button"
              onClick={() => setTab("packages")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${tab === "packages" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Package className="h-3.5 w-3.5" />
              Open Source
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "people" ? "Search a name or role..." : "Search a package..."}
              className="pl-9 h-9 rounded-xl"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {tab === "people" ? (
            <div className="space-y-6 px-5 py-4 pb-6">
              {grouped.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No helping hands match &ldquo;{query}&rdquo;.
                </p>
              ) : (
                grouped.map((group) => (
                  <section key={group.category} className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {CONTRIBUTOR_CATEGORY_LABELS[group.category]}
                      </h3>
                      <div className="h-px flex-1 bg-border/60" />
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        {group.items.length}
                      </Badge>
                    </div>

                    <div className="space-y-2.5">
                      {group.items.map((contributor) => (
                        <div
                          key={contributor.name}
                          className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-3.5 transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                        >
                          <div className={`pointer-events-none absolute -left-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br ${contributor.gradient} opacity-[0.08] blur-xl transition-opacity duration-300 group-hover:opacity-[0.16]`} />

                          <div className="relative flex items-start gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${contributor.gradient} text-sm font-black text-white shadow-sm`}
                              aria-hidden
                            >
                              {getInitials(contributor.name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="text-sm font-bold tracking-tight">{contributor.name}</p>
                                <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                                  {contributor.role}
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {contributor.description}
                              </p>
                              {contributor.link && (
                                <a
                                  href={contributor.link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                >
                                  {contributor.link.label}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}

              <div className="rounded-xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/5 to-accent/5 p-4 text-center">
                <Sparkles className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <p className="text-xs font-semibold">Want to join the wall of helpers?</p>
                <a
                  href="https://github.com/Shubhamnpk/mywallet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Contribute on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-2 px-5 py-4 pb-6">
              {filteredPackages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No packages match &ldquo;{query}&rdquo;.
                </p>
              ) : (
                filteredPackages.map((pkg) => (
                  <a
                    key={pkg.name}
                    href={pkg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-3 transition-all duration-300 hover:border-accent/40 hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/15 to-primary/15 ring-1 ring-accent/20 text-accent">
                      <Package className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">{pkg.name}</span>
                        <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                          {pkg.tag}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{pkg.description}</span>
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">v{pkg.version}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1 text-muted-foreground transition-colors group-hover:text-primary" />
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
