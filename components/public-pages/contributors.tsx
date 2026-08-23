"use client"

import { useMemo, useState } from "react"
import { Heart, Github, Sparkles, ExternalLink, Users, Search, Package } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { PublicBackground } from "./public-background"
import {
  contributors,
  openSourcePackages,
  CONTRIBUTOR_CATEGORY_LABELS,
  CATEGORY_ORDER,
  getInitials,
} from "@/lib/contributors"

export function ContributorsPageClient() {
  const [query, setQuery] = useState("")

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

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: filtered.filter((c) => c.category === category),
      })).filter((group) => group.items.length > 0),
    [filtered],
  )

  const flatContributors = useMemo(
    () =>
      grouped.flatMap((group) =>
        group.items.map((contributor, index) => ({
          contributor,
          category: group.category,
          isFirstOfCategory: index === 0,
        })),
      ),
    [grouped],
  )

  return (
    <div className="relative">
      <PublicBackground />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Heart className="w-4 h-4" />
            Open Source Tribute
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
            The{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              helping hands
            </span>{" "}
            behind MyWallet
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Great software is never built alone. This page honors every contributor,
            tester, designer, service, and quiet supporter who helped MyWallet grow.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {contributors.length} honored groups &amp; people
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              100% open source, forever
            </span>
          </div>
        </section>

        {/* Search */}
        <section className="max-w-md mx-auto -mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a name or role..."
              className="pl-9 h-11 rounded-xl"
            />
          </div>
        </section>

        {/* Contributors - bento grid: first card of each category is featured and carries the label */}
        <section className="max-w-6xl mx-auto">
          {flatContributors.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No helping hands match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 [grid-auto-flow:dense] sm:grid-cols-3 lg:grid-cols-4">
              {flatContributors.map(({ contributor, category, isFirstOfCategory }) => (
                <div key={contributor.name} className="flex flex-col">
                  {isFirstOfCategory && (
                    <span className="mb-1.5 ml-1 text-[9px] font-black uppercase tracking-widest text-accent">
                      {CONTRIBUTOR_CATEGORY_LABELS[category]}
                    </span>
                  )}
                  <article
                    className={`group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl ${
                      isFirstOfCategory ? "col-span-2 row-span-1" : ""
                    }`}
                  >
                    <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${contributor.gradient} opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.18]`} />

                    <div className="relative flex min-h-0 flex-1 flex-col">
                      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${contributor.gradient} text-base font-black text-white shadow-lg transition-transform duration-300 group-hover:scale-105`}>
                        {getInitials(contributor.name)}
                      </div>

                      <h3 className={`font-bold tracking-tight leading-snug ${isFirstOfCategory ? "text-lg" : "text-base"}`}>
                        {contributor.name}
                      </h3>
                      <p className="mt-1 inline-block self-start rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {contributor.role}
                      </p>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {contributor.description}
                      </p>

                      {contributor.link && (
                        <a
                          href={contributor.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-primary hover:underline"
                        >
                          {contributor.link.label}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Open Source packages */}
        <section className="max-w-6xl mx-auto">
          <div className="mb-3.5 flex items-center gap-4 px-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Standing on Open Source
            </h2>
            <div className="h-px flex-1 bg-border/60" />
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
              {openSourcePackages.length} packages
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {openSourcePackages.map((pkg) => (
              <a
                key={pkg.name}
                href={pkg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
              >
                <div className="relative flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 ring-1 ring-primary/15 text-primary transition-transform duration-300 group-hover:scale-105">
                    <Package className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">{pkg.name}</span>
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                        {pkg.tag}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {pkg.description}
                    </span>
                    <span className="mt-1.5 block font-mono text-[10px] text-muted-foreground">
                      v{pkg.version}
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto pt-4 pb-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 md:p-10 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Github className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Become a helping hand</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
              Code, docs, design, bug reports, or kind words - every contribution matters and earns a place here.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/Shubhamnpk/mywallet"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Github className="h-4 w-4" />
                Contribute on GitHub
              </a>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-3 text-sm font-bold transition-colors hover:bg-muted/50"
              >
                About the project
              </Link>
            </div>
          </div>
        </section>
      </div>
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-gradient {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
