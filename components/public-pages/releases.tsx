"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, Globe, History, Rocket, Sparkles, Tag, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatAppDate } from "@/lib/app-calendar"
import { cn } from "@/lib/utils"
import { PublicLayout } from "@/components/public-pages/public-layout"

type ReleaseStatus = "current" | "stable"
type ReleaseCategory = "Feature" | "Bugfix" | "Improvement" | "Major" | "UX" | "Security" | "Performance"

interface ReleaseItem {
  version: string
  date: string
  status: ReleaseStatus
  category?: ReleaseCategory
  title: string
  highlights: string[]
}

export interface ReleasesData {
  currentBuild: string
  releases: ReleaseItem[]
}

function formatReleaseDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : formatAppDate(parsed, "BS")
}

function releaseAnchor(version: string) {
  return `release-${version.replaceAll(".", "-")}`
}

function getReleaseSpanLabel(releases: ReleaseItem[]) {
  const dates = releases
    .map((release) => new Date(`${release.date}T00:00:00`))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  if (dates.length < 2) return "1 release day"
  const first = dates[0]
  const latest = dates[dates.length - 1]
  const months = Math.max(1, (latest.getFullYear() - first.getFullYear()) * 12 + latest.getMonth() - first.getMonth() + 1)
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${months} months`
  if (remainingMonths === 0) return `${years} year${years === 1 ? "" : "s"}`
  return `${years}y ${remainingMonths}m`
}

const categoryColors: Record<ReleaseCategory, string> = {
  Feature: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300",
  Bugfix: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-300",
  Improvement: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300",
  Major: "bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-300",
  UX: "bg-pink-500/10 text-pink-700 border-pink-200 dark:text-pink-300",
  Security: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300",
  Performance: "bg-cyan-500/10 text-cyan-700 border-cyan-200 dark:text-cyan-300",
}

export function ReleasesPageClient({ data, currentVersion }: { data: ReleasesData; currentVersion: string }) {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const releases = data.releases as ReleaseItem[]
  const currentRelease = releases.find((release) => release.status === "current") ?? releases[0]
  const stableCount = releases.filter((release) => release.status === "stable").length
  const highlightCount = releases.reduce((total, release) => total + release.highlights.length, 0)
  const releaseSpan = getReleaseSpanLabel(releases)

  return (
    <PublicLayout>
      <div className="relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse -translate-x-1/2" />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse translate-x-1/2" style={{ animationDelay: "1s" }} />
          <div
            className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl"
            style={{ transform: `translate(-50%, -50%) scale(${1 + scrollY * 0.0002})` }}
          />
        </div>

        <section className="relative border-b border-border/60 bg-gradient-to-b from-background via-muted/30 to-background">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Globe className="h-4 w-4" />
              Public Release Page
            </div>

            <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">MyWallet changelog</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    Release notes
                  </span>
                  {" "}that tell the product story.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Every shipped version in one public place, from the first stable wallet release to the latest roadmap, portfolio, crypto, sync, and automation work.
                </p>
                <div className="mt-5 grid max-w-xl grid-cols-3 gap-2">
                  <CompactReleaseStat label="Total Releases" value={releases.length} />
                  <CompactReleaseStat label="Stable Builds" value={stableCount} />
                  <CompactReleaseStat label="Release Notes" value={highlightCount} />
                </div>
              </div>

              <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Rocket className="h-5 w-5 text-primary" />
                    Current Release
                  </CardTitle>
                  <CardDescription>Latest production version and build identifier.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <ReleaseMetric label="Version" value={`v${currentVersion}`} />
                  <ReleaseMetric label="Build" value={data.currentBuild} mono />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

          <Card className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 backdrop-blur-sm shadow-lg">
            <CardHeader className="py-2.5 px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm font-semibold truncate">Latest: v{currentRelease.version}</span>
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">{currentRelease.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5">Current</Badge>
                  {currentRelease.category && (
                    <Badge variant="outline" className={cn("border-border/50 text-[10px] h-5 px-1.5", categoryColors[currentRelease.category])}>
                      {currentRelease.category}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <ReleaseHighlights highlights={currentRelease.highlights} compact />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-5 w-5 text-primary" />
                    Versions
                  </CardTitle>
                  <CardDescription>Jump to a release.</CardDescription>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
                      <p className="text-lg font-bold leading-none tabular-nums">{releases.length}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Releases</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
                      <p className="text-lg font-bold leading-none">{releaseSpan}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Since first</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[300px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                  {releases.map((release) => {
                    const anchor = releaseAnchor(release.version)
                    return (
                      <button
                        key={release.version}
                        type="button"
                        onClick={() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className="block w-full text-left rounded-lg border border-border/60 bg-background/60 p-3 transition hover:border-primary/30 hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-semibold">v{release.version}</span>
                          <Badge className={release.status === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                            {release.status === "current" ? "Current" : "Stable"}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{release.title}</p>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </aside>

            <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-lg">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-primary" />
                  Release Timeline
                </CardTitle>
                <CardDescription>Newest release appears first.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[600px] space-y-4 overflow-y-auto pr-1 scrollbar-thin p-4">
                {releases.map((release, index) => (
                  <article
                    id={releaseAnchor(release.version)}
                    key={release.version}
                    className="scroll-mt-24 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="grid gap-4 sm:grid-cols-[156px_1fr]">
                      <div className="space-y-2">
                        <Badge variant="outline" className="font-semibold border-border/50">v{release.version}</Badge>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatReleaseDate(release.date)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={release.status === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                            {release.status === "current" ? "Current" : "Stable"}
                          </Badge>
                          {release.category && (
                            <Badge variant="outline" className={cn("border-border/50", categoryColors[release.category])}>
                              {release.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Release #{releases.length - index}</p>
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-base font-semibold sm:text-lg">{release.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{release.highlights.length} highlights included.</p>
                      </div>
                    </div>

                    <ReleaseHighlights highlights={release.highlights} />
                  </article>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 backdrop-blur-xl p-8 md:p-14 text-center shadow-2xl">
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
            <div className="relative">
              <Badge variant="outline" className="mb-4 bg-background/60 border-primary/20 text-primary rounded-full px-4 py-1.5">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Stay in the loop
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Follow the journey
                </span>
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
                Every release is a step forward. See what has shipped and what is coming next on the roadmap.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button asChild className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform">
                  <Link href="/">
                    Try MyWallet
                  </Link>
                </Button>
                <Button variant="outline" asChild className="rounded-xl gap-2 hover:border-primary/40 transition-colors">
                  <Link href="/roadmap">
                    View roadmap
                  </Link>
                </Button>
              </div>
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
          animation: gradient 4s ease infinite;
        }
      `}</style>
    </PublicLayout>
  )
}

function ReleaseMetric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", mono && "font-mono")}>{value}</p>
    </div>
  )
}

function CompactReleaseStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 shadow-sm">
      <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase leading-4 tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function ReleaseHighlights({ highlights, compact = false }: { highlights: string[]; compact?: boolean }) {
  return (
    <details className={compact ? "group" : "group mt-4"}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm font-medium transition hover:border-primary/30 hover:bg-muted/50">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>{compact ? "View current release highlights" : "View highlights"}</span>
        </span>
        <span className="text-xs text-muted-foreground group-open:hidden">{highlights.length} items</span>
        <span className="hidden text-xs text-muted-foreground group-open:inline">Hide details</span>
      </summary>
      <ul className={compact ? "mt-3 grid gap-3 md:grid-cols-2" : "mt-3 grid gap-2"}>
        {highlights.map((item) => (
          <li key={item} className="rounded-lg border border-border/60 bg-background/60 p-3 transition hover:border-border/80 hover:bg-background/80">
            <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          </li>
        ))}
      </ul>
    </details>
  )
}
