"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bitcoin,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Cloud,
  Compass,
  Database,
  Flag,
  Home,
  LineChart,
  ListFilter,
  LockKeyhole,
  Milestone,
  Palette,
  PlugZap,
  Search,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type RoadmapStatus = "completed" | "in-progress" | "planned" | "exploring"
type StatusFilter = RoadmapStatus | "all" | "open"
type RoadmapPriority = "critical" | "high" | "medium" | "low"

interface RoadmapMilestone {
  id: string
  title: string
  version: string
  progress: number
  description: string
}

interface RoadmapCategory {
  id: string
  label: string
  color: string
}

interface RoadmapItem {
  id: string
  title: string
  description: string
  status: RoadmapStatus
  category: string
  milestone: string
  completedDate?: string
  priority: RoadmapPriority
}

export interface RoadmapData {
  lastUpdated: string
  milestones: RoadmapMilestone[]
  categories: RoadmapCategory[]
  items: RoadmapItem[]
}

const statusMeta: Record<RoadmapStatus, { label: string; icon: typeof CheckCircle2; className: string; dot: string }> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  "in-progress": {
    label: "In Progress",
    icon: Timer,
    className: "border-blue-200 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  planned: {
    label: "Planned",
    icon: Flag,
    className: "border-violet-200 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  exploring: {
    label: "Exploring",
    icon: Compass,
    className: "border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
}

const priorityMeta: Record<RoadmapPriority, { label: string; className: string; weight: number }> = {
  critical: { label: "Critical", className: "border-red-200 bg-red-500/10 text-red-700 dark:text-red-300", weight: 4 },
  high: { label: "High", className: "border-orange-200 bg-orange-500/10 text-orange-700 dark:text-orange-300", weight: 3 },
  medium: { label: "Medium", className: "border-sky-200 bg-sky-500/10 text-sky-700 dark:text-sky-300", weight: 2 },
  low: { label: "Low", className: "border-slate-200 bg-slate-500/10 text-slate-700 dark:text-slate-300", weight: 1 },
}

const categoryClassByColor: Record<string, string> = {
  emerald: "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  blue: "border-blue-200 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  amber: "border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  purple: "border-violet-200 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  pink: "border-pink-200 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  slate: "border-slate-200 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  cyan: "border-cyan-200 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  orange: "border-orange-200 bg-orange-500/10 text-orange-700 dark:text-orange-300",
}

const categoryIconById: Record<string, typeof CheckCircle2> = {
  core: WalletCards,
  portfolio: LineChart,
  security: LockKeyhole,
  sync: Cloud,
  ux: Palette,
  infra: Database,
  extension: PlugZap,
  crypto: Bitcoin,
  tools: Calculator,
  ai: Sparkles,
}

const statusOrder: RoadmapStatus[] = ["in-progress", "planned", "exploring", "completed"]

const visualProgressByStatus: Record<RoadmapStatus, number> = {
  completed: 100,
  "in-progress": 72,
  planned: 32,
  exploring: 16,
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(parsed)
}

function normalize(value: string) {
  return value.toLowerCase().trim()
}

export function RoadmapPageClient({ data }: { data: RoadmapData }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("open")
  const [category, setCategory] = useState("all")
  const [priority, setPriority] = useState<RoadmapPriority | "all">("all")
  const [milestone, setMilestone] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const categoryById = useMemo(() => new Map(data.categories.map((item) => [item.id, item])), [data.categories])
  const milestoneById = useMemo(() => new Map(data.milestones.map((item) => [item.id, item])), [data.milestones])
  const milestonesNewestFirst = useMemo(() => [...data.milestones].reverse(), [data.milestones])

  const stats = useMemo(() => {
    const completed = data.items.filter((item) => item.status === "completed").length
    const active = data.items.filter((item) => item.status === "in-progress").length
    const planned = data.items.filter((item) => item.status === "planned").length
    const exploring = data.items.filter((item) => item.status === "exploring").length
    const averageProgress = Math.round(
      data.milestones.reduce((total, item) => total + item.progress, 0) / Math.max(data.milestones.length, 1),
    )
    const criticalOpen = data.items.filter((item) => item.priority === "critical" && item.status !== "completed").length

    return { completed, active, planned, exploring, averageProgress, criticalOpen, total: data.items.length }
  }, [data.items, data.milestones])

  const milestoneCounts = useMemo(() => {
    return new Map(
      data.milestones.map((item) => {
        const milestoneItems = data.items.filter((roadmapItem) => roadmapItem.milestone === item.id)
        const completedItems = milestoneItems.filter((roadmapItem) => roadmapItem.status === "completed")

        return [item.id, { completed: completedItems.length, total: milestoneItems.length }]
      }),
    )
  }, [data.items, data.milestones])

  const currentFeatureGroups = useMemo(() => {
    return data.categories
      .map((categoryItem) => {
        const features = data.items
          .filter((item) => item.status === "completed" && item.category === categoryItem.id)
          .sort((a, b) => priorityMeta[b.priority].weight - priorityMeta[a.priority].weight || a.title.localeCompare(b.title))

        return { category: categoryItem, features }
      })
      .filter((group) => group.features.length > 0)
  }, [data.categories, data.items])

  const filteredItems = useMemo(() => {
    const search = normalize(query)

    return data.items
      .filter((item) => {
        const itemCategory = categoryById.get(item.category)
        const itemMilestone = milestoneById.get(item.milestone)
        const searchable = normalize(
          [item.title, item.description, item.status, item.priority, itemCategory?.label, itemMilestone?.title, itemMilestone?.version]
            .filter(Boolean)
            .join(" "),
        )

        return (
          (!search || searchable.includes(search)) &&
          (status === "all" || (status === "open" ? item.status !== "completed" : item.status === status)) &&
          (category === "all" || item.category === category) &&
          (priority === "all" || item.priority === priority) &&
          (milestone === "all" || item.milestone === milestone)
        )
      })
      .sort((a, b) => {
        const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
        if (statusDiff !== 0) return statusDiff
        return priorityMeta[b.priority].weight - priorityMeta[a.priority].weight
      })
  }, [category, categoryById, data.items, milestone, milestoneById, priority, query, status])

  const resetFilters = () => {
    setQuery("")
    setStatus("open")
    setCategory("all")
    setPriority("all")
    setMilestone("all")
  }

  const selectMilestone = (value: string) => {
    setMilestone(value)

    if (value === "all") {
      setStatus("open")
      return
    }

    const selectedMilestone = milestoneById.get(value)
    setStatus(selectedMilestone && selectedMilestone.progress >= 100 ? "completed" : "open")
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_55%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
          <div className="flex min-w-0 flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Public Product Roadmap
                </Badge>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="bg-background/70">
                    <Link href="/">
                      <Home className="mr-1.5 h-4 w-4" />
                      Home
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/releases">
                      Releases
                      <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-8 max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">MyWallet direction board</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Goals, progress, and the next smart finance moves.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  A transparent view of what has shipped, what is being built, what is queued, and what is still being explored.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Shipped" value={stats.completed} icon={CheckCircle2} tone="emerald" />
              <Metric label="In Motion" value={stats.active} icon={Timer} tone="blue" />
              <Metric label="Planned" value={stats.planned} icon={Flag} tone="violet" />
              <Metric label="Exploring" value={stats.exploring} icon={Compass} tone="amber" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="overflow-hidden border-border/80 bg-card/85 shadow-xl backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-primary" />
                  Overall Roadmap Health
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-[112px_1fr] items-center gap-5">
                <div
                  className="grid aspect-square place-items-center rounded-full"
                  style={{ background: `conic-gradient(hsl(var(--primary)) ${stats.averageProgress}%, hsl(var(--muted)) 0)` }}
                >
                  <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-card text-center shadow-inner">
                    <span className="text-2xl font-bold">{stats.averageProgress}%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Milestone average</p>
                    <p className="text-2xl font-semibold">{data.milestones.length} milestone tracks</p>
                  </div>
                  <Progress value={stats.averageProgress} className="h-2.5" />
                  <p className="text-sm text-muted-foreground">Last updated {formatDate(data.lastUpdated)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-hidden">
          <Card className="border-border/80 bg-card/90 shadow-sm lg:shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListFilter className="h-5 w-5" />
                  Find Work
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 bg-background"
                  onClick={() => setShowFilters((value) => !value)}
                >
                  {showFilters ? "Hide" : "Filters"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roadmap goals..." className="h-11 pl-9" />
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/70 bg-background/50 p-3">
                  <SelectFilter label="Status" value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                    <SelectItem value="open">Open work</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="exploring">Exploring</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="all">Everything</SelectItem>
                  </SelectFilter>

                  <SelectFilter label="Priority" value={priority} onValueChange={(value) => setPriority(value as RoadmapPriority | "all")}>
                    <SelectItem value="all">All priorities</SelectItem>
                    {Object.entries(priorityMeta).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.label}</SelectItem>
                    ))}
                  </SelectFilter>

                  <SelectFilter label="Category" value={category} onValueChange={setCategory}>
                    <SelectItem value="all">All categories</SelectItem>
                    {data.categories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                    ))}
                  </SelectFilter>

              <SelectFilter label="Milestone" value={milestone} onValueChange={selectMilestone}>
                    <SelectItem value="all">All milestones</SelectItem>
                    {milestonesNewestFirst.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.version}</SelectItem>
                    ))}
                  </SelectFilter>

                  <Button variant="outline" className="col-span-2 w-full" onClick={resetFilters}>Reset filters</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex min-h-0 overflow-hidden border-border/80 bg-card/90 shadow-sm lg:max-h-[calc(100vh-17rem)] lg:flex-col">
            <CardHeader className="border-b border-border/70 bg-muted/30 pb-4">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <Milestone className="h-5 w-5" />
                  Milestone Journey
                </span>
                <Badge variant="outline" className="bg-background/80">
                  {data.milestones.length} steps
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 p-0 lg:flex-1 lg:overflow-y-auto">
              <div className="p-4">
              <div className="relative space-y-3">
                <div className="absolute bottom-8 left-9 top-8 w-px bg-gradient-to-b from-emerald-500 via-sky-500 to-amber-500 opacity-70" />
                {milestonesNewestFirst.map((item) => {
                  const milestoneNumber = data.milestones.findIndex((milestoneItem) => milestoneItem.id === item.id) + 1
                  const isSelected = milestone === item.id
                  const isComplete = item.progress >= 100
                  const isActive = item.progress > 0 && item.progress < 100
                  const StepIcon = isComplete ? CheckCircle2 : isActive ? Timer : Flag
                  const counts = milestoneCounts.get(item.id)
                  const ringColor = isComplete ? "#10b981" : isActive ? "#2563eb" : "#f59e0b"
                  const ringTrack = "rgba(148, 163, 184, 0.28)"

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectMilestone(item.id)}
                      className={cn(
                        "group relative grid w-full grid-cols-[64px_1fr] gap-3 rounded-lg p-2 text-left transition",
                        isSelected ? "bg-primary/10 shadow-sm" : "hover:bg-muted/60",
                      )}
                    >
                      <span
                        className="relative z-10 grid h-14 w-14 place-items-center rounded-full border border-background shadow-md ring-1 ring-border/70"
                        style={{ background: `conic-gradient(${ringColor} ${item.progress}%, ${ringTrack} 0)` }}
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-background shadow-inner">
                          <StepIcon className={cn("h-5 w-5", isComplete ? "text-emerald-600" : isActive ? "text-blue-600" : "text-amber-600")} />
                        </span>
                      </span>

                      <span className={cn("min-w-0 rounded-lg border p-3 transition", isSelected ? "border-primary/50 bg-background shadow-sm" : "border-border/70 bg-background/70 group-hover:border-primary/30")}>
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-5">{item.title}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{item.version}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-semibold">{item.progress}%</span>
                        </span>

                        <span className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={isComplete ? statusMeta.completed.className : isActive ? statusMeta["in-progress"].className : statusMeta.planned.className}>
                            Step {milestoneNumber}
                          </Badge>
                          <Badge variant="outline" className="bg-background">
                            {counts?.completed ?? 0}/{counts?.total ?? 0} done
                          </Badge>
                        </span>

                        <Progress value={item.progress} className="mt-3 h-1.5" />
                      </span>
                    </button>
                  )
                })}
              </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card/90 p-4 shadow-sm">
            <div>
              <p className="text-sm text-muted-foreground">Showing</p>
              <h2 className="text-xl font-semibold">{filteredItems.length} roadmap goals</h2>
              {status === "open" && (
                <p className="mt-1 text-xs text-muted-foreground">Completed goals are hidden. Select Completed or Everything to review shipped work.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusCount status="completed" count={stats.completed} />
              <StatusCount status="in-progress" count={stats.active} />
              <StatusCount status="planned" count={stats.planned} />
              <StatusCount status="exploring" count={stats.exploring} />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredItems.map((item) => {
              const itemStatus = statusMeta[item.status]
              const StatusIcon = itemStatus.icon
              const itemCategory = categoryById.get(item.category)
              const itemMilestone = milestoneById.get(item.milestone)

              return (
                <article key={item.id} className="group overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                  <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={itemStatus.className}>
                          <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                          {itemStatus.label}
                        </Badge>
                        <Badge variant="outline" className={priorityMeta[item.priority].className}>{priorityMeta[item.priority].label}</Badge>
                        {itemCategory && (
                          <Badge variant="outline" className={categoryClassByColor[itemCategory.color] ?? "bg-muted"}>{itemCategory.label}</Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{item.description}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CircleDot className="h-3.5 w-3.5" />
                          {itemMilestone?.title ?? item.milestone}
                        </span>
                        {itemMilestone && (
                          <span className="inline-flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {itemMilestone.version}
                          </span>
                        )}
                        {item.completedDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(item.completedDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:w-36 sm:flex-col sm:items-stretch sm:justify-center">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted sm:hidden">
                        <div className={cn("h-full rounded-full", itemStatus.dot)} style={{ width: `${visualProgressByStatus[item.status]}%` }} />
                      </div>
                      <div className="hidden h-24 w-2 flex-none items-end overflow-hidden rounded-full bg-muted sm:flex sm:self-center">
                        <div className={cn("w-full rounded-full", itemStatus.dot)} style={{ height: `${visualProgressByStatus[item.status]}%` }} />
                      </div>
                      <span className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-center">{item.status.replace("-", " ")}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {filteredItems.length === 0 && (
            <Card className="border-dashed bg-card/80">
              <CardContent className="grid place-items-center gap-3 p-10 text-center">
                <Search className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">No roadmap goals found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Try a different keyword, category, status, or milestone.</p>
                </div>
                <Button variant="outline" onClick={resetFilters}>Clear search</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <CurrentFeaturesSection groups={currentFeatureGroups} completedCount={stats.completed} />
    </main>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof CheckCircle2
  tone: "emerald" | "blue" | "violet" | "amber"
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    violet: "bg-violet-500/10 text-violet-600",
    amber: "bg-amber-500/10 text-amber-600",
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/85 p-4 shadow-sm backdrop-blur">
      <div className={cn("mb-3 grid h-9 w-9 place-items-center rounded-md", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function CurrentFeaturesSection({
  groups,
  completedCount,
}: {
  groups: Array<{ category: RoadmapCategory; features: RoadmapItem[] }>
  completedCount: number
}) {
  return (
    <section className="border-t border-border/70 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Badge variant="outline" className="mb-3 bg-background/80">
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Current Features
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything already available in MyWallet</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A bento view of shipped capabilities across finance basics, portfolio, crypto, exchange APIs, security, sync, and productivity tools.
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/80 px-4 py-3 text-right shadow-sm">
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live features</p>
          </div>
        </div>

        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {groups.map(({ category: categoryItem, features }, index) => {
            const FeatureIcon = categoryIconById[categoryItem.id] ?? BarChart3

            return (
              <Card
                key={categoryItem.id}
                className={cn(
                  "group mb-4 break-inside-avoid overflow-hidden border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
                  index === 0 && "bg-primary/5",
                  index === 1 && "bg-cyan-500/5",
                  index === 2 && "bg-emerald-500/5",
                )}
              >
                <CardHeader className="border-b border-border/70 bg-background/60 pb-4">
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg border", categoryClassByColor[categoryItem.color] ?? "bg-muted")}>
                        <FeatureIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{categoryItem.label}</span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{features.length} shipped</span>
                      </span>
                    </span>
                    <Badge variant="outline" className={categoryClassByColor[categoryItem.color] ?? "bg-muted"}>
                      Live
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2.5 p-3.5">
                  {features.map((feature) => (
                    <div key={feature.id} className="rounded-md border border-border/70 bg-background/60 p-2.5 transition group-hover:border-border">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-5">{feature.title}</p>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SelectFilter({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    </div>
  )
}

function StatusCount({ status, count }: { status: RoadmapStatus; count: number }) {
  const meta = statusMeta[status]
  return (
    <Badge variant="outline" className={meta.className}>
      <span className={cn("mr-1.5 h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}: {count}
    </Badge>
  )
}
