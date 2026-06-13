import releasesData from "@/data/releases.json"
import packageJson from "@/package.json"
import { CalendarDays, CheckCircle2, Globe, History, Home, Map, Rocket, Settings2, Tag } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatAppDate } from "@/lib/app-calendar"

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

export const metadata = {
  title: "Release Notes | MyWallet",
  description: "Public changelog and shipped versions of MyWallet.",
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
  const months = Math.max(
    1,
    (latest.getFullYear() - first.getFullYear()) * 12 + latest.getMonth() - first.getMonth() + 1,
  )
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

export default function ReleasesPage() {
  const releases = releasesData.releases as ReleaseItem[]
  const currentRelease = releases.find((release) => release.status === "current") ?? releases[0]
  const stableCount = releases.filter((release) => release.status === "stable").length
  const highlightCount = releases.reduce((total, release) => total + release.highlights.length, 0)
  const releaseSpan = getReleaseSpanLabel(releases)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_58%,hsl(var(--background))_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Public Release Page
            </Badge>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="bg-background/70">
                <Link href="/">
                  <Home className="mr-1.5 h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="bg-background/70">
                <Link href="/roadmap">
                  <Map className="mr-1.5 h-4 w-4" />
                  Roadmap
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="bg-background/70">
                <Link href="/settings?tab=about">
                  <Settings2 className="mr-1.5 h-4 w-4" />
                  About
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">MyWallet changelog</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-balance sm:text-5xl">Release notes that tell the product story.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Every shipped version in one public place, from the first stable wallet release to the latest roadmap, portfolio, crypto, sync, and automation work.
              </p>
              <div className="mt-5 grid max-w-xl grid-cols-3 gap-2">
                <CompactReleaseStat label="Total Releases" value={releases.length} />
                <CompactReleaseStat label="Stable Builds" value={stableCount} />
                <CompactReleaseStat label="Release Notes" value={highlightCount} />
              </div>
            </div>

            <Card className="border-border/80 bg-card/90 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Rocket className="h-5 w-5 text-primary" />
                  Current Release
                </CardTitle>
                <CardDescription>Latest production version and build identifier.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <ReleaseMetric label="Version" value={`v${packageJson.version}`} />
                <ReleaseMetric label="Build" value={releasesData.currentBuild} mono />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="border-b border-border/70 bg-muted/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Latest: v{currentRelease.version}</CardTitle>
                <CardDescription className="mt-1">{currentRelease.title}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary text-primary-foreground">Current</Badge>
                {currentRelease.category && (
                  <Badge variant="outline" className={categoryColors[currentRelease.category]}>
                    <Tag className="mr-1.5 h-3.5 w-3.5" />
                    {currentRelease.category}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <ReleaseHighlights highlights={currentRelease.highlights} compact />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5" />
                  Versions
                </CardTitle>
                <CardDescription>Jump to a release.</CardDescription>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2">
                    <p className="text-lg font-bold leading-none">{releases.length}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Releases</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2">
                    <p className="text-lg font-bold leading-none">{releaseSpan}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Since first</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-8rem)] space-y-2 overflow-y-auto">
                {releases.map((release) => (
                  <Link
                    key={release.version}
                    href={`#${releaseAnchor(release.version)}`}
                    className="block rounded-lg border border-border/70 bg-background/70 p-3 transition hover:border-primary/40 hover:bg-muted/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">v{release.version}</span>
                      <Badge className={release.status === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                        {release.status === "current" ? "Current" : "Stable"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{release.title}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </aside>

          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Release Timeline
              </CardTitle>
              <CardDescription>Newest release appears first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {releases.map((release, index) => (
                <article
                  id={releaseAnchor(release.version)}
                  key={release.version}
                  className="scroll-mt-4 rounded-lg border border-border/70 bg-background/75 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="grid gap-4 sm:grid-cols-[156px_1fr]">
                    <div className="space-y-2">
                      <Badge variant="outline" className="font-semibold">v{release.version}</Badge>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatReleaseDate(release.date)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={release.status === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                          {release.status === "current" ? "Current" : "Stable"}
                        </Badge>
                        {release.category && (
                          <Badge variant="outline" className={categoryColors[release.category]}>
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
    </main>
  )
}

function ReleaseMetric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}

function CompactReleaseStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2 shadow-sm">
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase leading-4 tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function ReleaseHighlights({ highlights, compact = false }: { highlights: string[]; compact?: boolean }) {
  return (
    <details className={compact ? "group" : "group mt-4"}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:bg-muted/60">
        <span>{compact ? "View current release highlights" : "View highlights"}</span>
        <span className="text-xs text-muted-foreground group-open:hidden">{highlights.length} items</span>
        <span className="hidden text-xs text-muted-foreground group-open:inline">Hide details</span>
      </summary>
      <ul className={compact ? "mt-3 grid gap-3 md:grid-cols-2" : "mt-3 grid gap-2"}>
        {highlights.map((item) => (
          <li key={item} className="rounded-lg border border-border/70 bg-background/70 p-3">
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
