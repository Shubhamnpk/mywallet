import releasesData from "@/data/releases.json"
import packageJson from "@/package.json"
import { CheckCircle2, Globe, History, Home, Rocket, Settings2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ReleaseStatus = "current" | "stable"

interface ReleaseItem {
  version: string
  date: string
  status: ReleaseStatus
  title: string
  highlights: string[]
}

export const metadata = {
  title: "Release Notes | MyWallet",
  description: "Public changelog and shipped versions of MyWallet."
}

function formatReleaseDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export default function ReleasesPage() {
  const releases = releasesData.releases as ReleaseItem[]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 border-b bg-card/40 backdrop-blur-xl border-border/60">
        <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge className="rounded-full bg-primary text-primary-foreground">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Public Release Page
            </Badge>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="bg-card/70 border-border/60">
                <Link href="/">
                  <Home className="mr-1.5 h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="bg-card/70 border-border/60">
                <Link href="/settings?tab=about">
                  <Settings2 className="mr-1.5 h-4 w-4" />
                  About
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 sm:mt-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">MyWallet Release Notes</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              All shipped versions in one place. This page is publicly accessible and does not require authentication.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto max-w-5xl px-4 py-8 sm:py-10 space-y-6">
        <Card className="bg-card/80 backdrop-blur-xl border-border shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Rocket className="w-6 h-6" />
              Current Release
            </CardTitle>
            <CardDescription>Latest production version and build identifier.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Version</p>
                <p className="mt-1 text-2xl font-bold">v{packageJson.version}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Build</p>
                <p className="mt-1 font-mono text-lg">{releasesData.currentBuild}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border-border shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5" />
              Shipped Releases
            </CardTitle>
            <CardDescription>Newest release appears first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {releases.map((release, index) => (
              <div key={release.version} className="relative overflow-hidden rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm sm:p-5">
                <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-border" />
                <div
                  className={`pointer-events-none absolute left-0 top-0 h-full w-1 ${
                    release.status === "current" ? "bg-primary" : "bg-accent"
                  }`}
                />

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-semibold">
                    v{release.version}
                  </Badge>
                  <Badge className={release.status === "current" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-accent text-accent-foreground hover:bg-accent/90"}>
                    {release.status === "current" ? "Current" : "Stable"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{formatReleaseDate(release.date)}</span>
                  <span className="ml-auto text-xs text-muted-foreground/80">#{releases.length - index}</span>
                </div>

                <h2 className="text-base font-semibold sm:text-lg">{release.title}</h2>

                <ul className="mt-3 space-y-2">
                  {release.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
