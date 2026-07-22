"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
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
  History,
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
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { PublicLayout } from "@/components/public-layout"

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
  const [scrollY, setScrollY] = useState(0)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const categoryById = useMemo(() => new Map(data.categories.map((item) => [item.id, item])), [data.categories])
  const milestoneById = useMemo(() => new Map(data.milestones.map((item) => [item.id, item])), [data.milestones])
  const milestonesNewestFirst = useMemo(() => [...data.milestones].reverse(), [data.milestones])

  const stats = useMemo(() => {
    const filtered = milestone === "all" ? data.items : data.items.filter((item) => item.milestone === milestone)
    const completed = filtered.filter((item) => item.status === "completed").length
    const active = filtered.filter((item) => item.status === "in-progress").length
    const planned = filtered.filter((item) => item.status === "planned").length
    const exploring = filtered.filter((item) => item.status === "exploring").length
    const averageProgress = Math.round(
      data.milestones.reduce((total, item) => total + item.progress, 0) / Math.max(data.milestones.length, 1),
    )
    const criticalOpen = filtered.filter((item) => item.priority === "critical" && item.status !== "completed").length

    return { completed, active, planned, exploring, averageProgress, criticalOpen, total: filtered.length }
  }, [data.items, data.milestones, milestone])

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

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (query) count++
    if (category !== "all") count++
    if (priority !== "all") count++
    if (milestone !== "all") count++
    return count
  }, [query, status, category, priority, milestone])

  const resetFilters = useCallback(() => {
    setQuery("")
    setStatus("open")
    setCategory("all")
    setPriority("all")
    setMilestone("all")
  }, [])

  const selectMilestone = useCallback((value: string) => {
    setMilestone(value)
    if (value === "all") {
      setStatus("open")
      return
    }
    const selectedMilestone = milestoneById.get(value)
    setStatus(selectedMilestone && selectedMilestone.progress >= 100 ? "completed" : "open")
  }, [milestoneById])

  const removeFilter = useCallback((filter: string) => {
    switch (filter) {
      case "query": setQuery(""); break
      case "category": setCategory("all"); break
      case "priority": setPriority("all"); break
      case "milestone": setMilestone("all"); break
    }
  }, [])

  const comingNext = useMemo(() => {
    const nextMilestone = data.milestones.find((m) => m.progress > 0 && m.progress < 100)
    if (!nextMilestone) return null
    const nextItems = data.items.filter((i) => i.milestone === nextMilestone.id && i.status !== "completed")
    return { milestone: nextMilestone, items: nextItems }
  }, [data.milestones, data.items])

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
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Public Product Roadmap
                </div>
                <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    Goals, progress,
                  </span>
                  <br />
                  and the next smart moves.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  A transparent view of what has shipped, what is being built, what is queued, and what is still being explored.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform">
                    <Link href="/features">
                      <BadgeCheck className="h-4 w-4" />
                      See live features
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-xl gap-2 hover:border-primary/40 transition-colors">
                    <Link href="/releases">
                      <History className="h-4 w-4" />
                      Release history
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                <MetricCard label="Shipped" value={stats.completed} icon={CheckCircle2} tone="emerald" />
                <MetricCard label="In Motion" value={stats.active} icon={Timer} tone="blue" />
                <MetricCard label="Planned" value={stats.planned} icon={Flag} tone="violet" />
                <MetricCard label="Exploring" value={stats.exploring} icon={Compass} tone="amber" />
              </div>
            </div>
          </div>
        </section>

        {comingNext && (
          <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6 mb-6">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/20 border border-primary/30 shadow-inner">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">Coming Next</p>
                  <h3 className="mt-1 text-xl font-bold">{comingNext.milestone.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-2xl">{comingNext.milestone.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Milestone className="h-4 w-4" />
                      {comingNext.milestone.version}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      {comingNext.items.length} open goals
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Progress value={comingNext.milestone.progress} className="h-2 w-24" />
                      <span className="text-sm font-semibold tabular-nums">{comingNext.milestone.progress}%</span>
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 rounded-xl gap-2"
                  onClick={() => selectMilestone(comingNext.milestone.id)}
                >
                  <ArrowRight className="h-4 w-4" />
                  View goals
                </Button>
              </div>
            </div>
          </section>
        )}

        <section
          ref={mainRef}
          className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[380px_1fr] lg:px-8"
        >
          <aside className="space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-hidden">
            <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListFilter className="h-5 w-5 text-primary" />
                    Find Work
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs tabular-nums">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={resetFilters}>
                        <X className="h-3 w-3" />
                        Clear
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 bg-background/80 lg:hidden"
                      onClick={() => setShowFilters((v) => !v)}
                    >
                      {showFilters ? "Hide" : "Filters"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search goals..."
                    className="h-11 pl-9 bg-background/60 border-border/60 focus-visible:ring-primary/30"
                  />
                </div>

                <div className={cn("space-y-3", showFilters ? "block" : "hidden lg:block")}>
                  <div className="flex flex-wrap gap-1.5">
                    {(["in-progress", "planned", "exploring", "completed"] as const).map((s) => {
                      const isActive = status === s
                      const meta = statusMeta[s]
                      const count = s === "completed" ? stats.completed : s === "in-progress" ? stats.active : s === "planned" ? stats.planned : stats.exploring
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(isActive ? "open" : s)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                              : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                          <span className="tabular-nums opacity-70">({count})</span>
                        </button>
                      )
                    })}
                  </div>

                  <SelectFilter label="Category" value={category} onValueChange={setCategory}>
                    <SelectItem value="all">All categories</SelectItem>
                    {data.categories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                    ))}
                  </SelectFilter>

                  <div className="grid grid-cols-2 gap-3">
                    <SelectFilter label="Priority" value={priority} onValueChange={(v) => setPriority(v as RoadmapPriority | "all")}>
                      <SelectItem value="all">All priorities</SelectItem>
                      {Object.entries(priorityMeta).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectFilter>

                    <SelectFilter label="Milestone" value={milestone} onValueChange={selectMilestone}>
                      <SelectItem value="all">All milestones</SelectItem>
                      {milestonesNewestFirst.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.version}</SelectItem>
                      ))}
                    </SelectFilter>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 overflow-hidden border-border/60 bg-card/80 backdrop-blur-xl shadow-lg lg:max-h-[calc(100vh-18rem)] lg:flex-col">
              <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <Milestone className="h-5 w-5 text-primary" />
                    Milestone Journey
                  </span>
                  <Badge variant="outline" className="bg-background/80 border-border/60">
                    {data.milestones.length} steps
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 p-0 lg:flex-1 lg:overflow-y-auto">
                <div className="p-4">
                  <div className="relative space-y-3">
                    <div className="absolute bottom-8 left-9 top-8 w-px bg-gradient-to-b from-emerald-500 via-sky-500 to-amber-500 opacity-50" />
                    {milestonesNewestFirst.map((item) => {
                      const milestoneNumber = data.milestones.findIndex((mi) => mi.id === item.id) + 1
                      const isSelected = milestone === item.id
                      const isComplete = item.progress >= 100
                      const isActive = item.progress > 0 && item.progress < 100
                      const StepIcon = isComplete ? CheckCircle2 : isActive ? Timer : Flag
                      const counts = milestoneCounts.get(item.id)
                      const ringColor = isComplete ? "#10b981" : isActive ? "#2563eb" : "#f59e0b"
                      const ringTrack = "rgba(148, 163, 184, 0.2)"

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectMilestone(item.id)}
                          className={cn(
                            "group relative grid w-full grid-cols-[64px_1fr] gap-3 rounded-xl p-2 text-left transition-all duration-200",
                            isSelected ? "bg-primary/10 shadow-sm ring-1 ring-primary/20" : "hover:bg-muted/50",
                          )}
                        >
                          <span
                            className="relative z-10 grid h-14 w-14 place-items-center rounded-full border-2 border-background shadow-md"
                            style={{ background: `conic-gradient(${ringColor} ${item.progress}%, ${ringTrack} 0)` }}
                          >
                            <span className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background shadow-inner">
                              <StepIcon className={cn("h-4 w-4", isComplete ? "text-emerald-500" : isActive ? "text-blue-500" : "text-amber-500")} />
                            </span>
                          </span>

                          <span className={cn(
                            "min-w-0 rounded-xl border p-3 transition-all duration-200",
                            isSelected
                              ? "border-primary/30 bg-background/80 shadow-sm"
                              : "border-border/60 bg-background/50 group-hover:border-primary/20",
                          )}>
                            <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold leading-5">{item.title}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">{item.version}</span>
                              </span>
                              <span className="shrink-0 rounded-full bg-muted/80 px-2 py-1 text-xs font-semibold tabular-nums">{item.progress}%</span>
                            </span>

                            <span className="mt-3 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={cn(
                                "border-border/50",
                                isComplete ? statusMeta.completed.className : isActive ? statusMeta["in-progress"].className : statusMeta.planned.className,
                              )}>
                                Step {milestoneNumber}
                              </Badge>
                              <Badge variant="outline" className="bg-background/60 border-border/50">
                                {counts?.completed ?? 0}/{counts?.total ?? 0} done
                              </Badge>
                            </span>

                            <Progress value={item.progress} className="mt-3 h-1.5 bg-muted/60" />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-primary" />
                  Overall Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <div
                    className="grid shrink-0 place-items-center rounded-full"
                    style={{ background: `conic-gradient(hsl(var(--primary)) ${stats.averageProgress}%, hsl(var(--muted)) 0)` }}
                  >
                    <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-card text-center shadow-inner border border-border/50 m-1">
                      <div>
                        <span className="text-2xl font-bold tabular-nums">{stats.averageProgress}%</span>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">avg</p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Progress value={stats.averageProgress} className="h-2.5 bg-muted/60" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{stats.completed}</span> of {stats.total} goals shipped
                      {stats.criticalOpen > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          {stats.criticalOpen} critical open
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Updated {formatDate(data.lastUpdated)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-5 min-w-0">
            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Showing</p>
                  <h2 className="text-xl font-bold">
                    {filteredItems.length}
                    <span className="text-muted-foreground font-normal ml-1">roadmap goal{filteredItems.length !== 1 ? "s" : ""}</span>
                  </h2>
                </div>
                {status === "open" && (
                  <p className="hidden sm:block text-xs text-muted-foreground/80 max-w-48 text-right leading-relaxed">Completed goals hidden. Select a badge to review shipped work.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <StatusBadge status="completed" count={stats.completed} active={status === "completed"} onClick={() => setStatus(status === "completed" ? "open" : "completed")} />
                <StatusBadge status="in-progress" count={stats.active} active={status === "in-progress"} onClick={() => setStatus(status === "in-progress" ? "open" : "in-progress")} />
                <StatusBadge status="planned" count={stats.planned} active={status === "planned"} onClick={() => setStatus(status === "planned" ? "open" : "planned")} />
                <StatusBadge status="exploring" count={stats.exploring} active={status === "exploring"} onClick={() => setStatus(status === "exploring" ? "open" : "exploring")} />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {query && (
                  <FilterChip label={`"${query}"`} onRemove={() => removeFilter("query")} />
                )}
                {category !== "all" && (
                  <FilterChip label={`Category: ${categoryById.get(category)?.label ?? category}`} onRemove={() => removeFilter("category")} />
                )}
                {priority !== "all" && (
                  <FilterChip label={`Priority: ${priorityMeta[priority as RoadmapPriority]?.label ?? priority}`} onRemove={() => removeFilter("priority")} />
                )}
                {milestone !== "all" && (
                  <FilterChip label={`Milestone: ${milestoneById.get(milestone)?.version ?? milestone}`} onRemove={() => removeFilter("milestone")} />
                )}
              </div>
            )}

            <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const itemStatus = statusMeta[item.status]
                  const StatusIcon = itemStatus.icon
                  const itemCategory = categoryById.get(item.category)
                  const itemMilestone = milestoneById.get(item.milestone)

                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border border-border/60 bg-card/90 backdrop-blur-sm",
                        "shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
                        item.status === "completed" && "hover:border-emerald-500/30",
                        item.status === "in-progress" && "hover:border-blue-500/30",
                        item.status === "planned" && "hover:border-violet-500/30",
                        item.status === "exploring" && "hover:border-amber-500/30",
                      )}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/[0.03] to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn("border-border/50", itemStatus.className)}>
                              <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                              {itemStatus.label}
                            </Badge>
                            <Badge variant="outline" className={cn("border-border/50", priorityMeta[item.priority].className)}>
                              {priorityMeta[item.priority].label}
                            </Badge>
                            {itemCategory && (
                              <Badge variant="outline" className={cn("border-border/50", categoryClassByColor[itemCategory.color] ?? "bg-muted")}>
                                {itemCategory.label}
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{item.title}</h3>
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

                        <div className="flex items-center gap-3 sm:w-32 sm:flex-col sm:items-stretch sm:justify-center">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60 sm:hidden">
                            <div className={cn("h-full rounded-full transition-all", itemStatus.dot)} style={{ width: `${item.status === "completed" ? 100 : item.status === "in-progress" ? 72 : item.status === "planned" ? 32 : 16}%` }} />
                          </div>
                          <div className="hidden h-24 w-2 flex-none items-end overflow-hidden rounded-full bg-muted/60 sm:flex sm:self-center">
                            <div className={cn("w-full rounded-full transition-all duration-500", itemStatus.dot)} style={{ height: `${item.status === "completed" ? 100 : item.status === "in-progress" ? 72 : item.status === "planned" ? 32 : 16}%` }} />
                          </div>
                          <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-center">{item.status.replace("-", " ")}</span>
                        </div>
                      </div>
                    </article>
                  )
                })
              ) : (
                <Card className="border-dashed border-border/60 bg-card/60 backdrop-blur-sm">
                  <CardContent className="grid place-items-center gap-4 p-12 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted/50 border border-border/60">
                      <Search className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">No roadmap goals found</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search, filters, or milestone selection.</p>
                    </div>
                    <Button variant="outline" onClick={resetFilters} className="rounded-xl gap-2">
                      <X className="h-4 w-4" />
                      Clear all filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        <CurrentFeaturesSection groups={currentFeatureGroups} completedCount={stats.completed} />

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
                  Shape what comes next
                </span>
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
                MyWallet is built in the open. Every feature, fix, and improvement is driven by real users like you.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button asChild className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform">
                  <Link href="/">
                    <WalletCards className="h-4 w-4" />
                    Try MyWallet
                  </Link>
                </Button>
                <Button variant="outline" asChild className="rounded-xl gap-2 hover:border-primary/40 transition-colors">
                  <Link href="/about">
                    <ArrowUpRight className="h-4 w-4" />
                    Learn more
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out both;
        }
      `}</style>
    </PublicLayout>
  )
}

function MetricCard({
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
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  }

  return (
    <div className="group relative rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/[0.03] to-transparent rounded-bl-full pointer-events-none" />
      <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition-colors", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary shadow-sm">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-primary/70 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function StatusBadge({ status, count, active, onClick }: { status: RoadmapStatus; count: number; active: boolean; onClick: () => void }) {
  const meta = statusMeta[status]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border cursor-pointer",
        active
          ? "border-primary/40 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
          : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}: <span className="font-semibold tabular-nums">{count}</span>
    </button>
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
    <section className="relative border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <BadgeCheck className="h-4 w-4" />
              Current Features
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything already in MyWallet
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Finance basics, portfolio tools, crypto, security, sync, and productivity features — all live today.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm px-5 py-4 text-right shadow-sm">
            <p className="text-3xl font-bold tabular-nums">{completedCount}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live features</p>
          </div>
        </div>

        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {groups.map(({ category: categoryItem, features }, index) => {
            const FeatureIcon = categoryIconById[categoryItem.id] ?? BarChart3
            return (
              <Card
                key={categoryItem.id}
                className={cn(
                  "group mb-4 break-inside-avoid overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm",
                  "shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
                  index === 0 && "bg-gradient-to-br from-primary/[0.03] to-transparent",
                  index === 1 && "bg-gradient-to-br from-cyan-500/[0.03] to-transparent",
                  index === 2 && "bg-gradient-to-br from-emerald-500/[0.03] to-transparent",
                )}
              >
                <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl border shadow-sm",
                        categoryClassByColor[categoryItem.color] ?? "bg-muted",
                      )}>
                        <FeatureIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{categoryItem.label}</span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{features.length} shipped</span>
                      </span>
                    </span>
                    <Badge variant="outline" className={cn("border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", categoryClassByColor[categoryItem.color])}>
                      Live
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2.5 p-3.5">
                  {features.map((feature) => (
                    <div key={feature.id} className="rounded-lg border border-border/50 bg-background/60 p-2.5 transition group-hover:border-border/80 group-hover:bg-background/80">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-5">{feature.title}</p>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground/80">{feature.description}</p>
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
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full bg-background/60 border-border/60 focus:ring-primary/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    </div>
  )
}
