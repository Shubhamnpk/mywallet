"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Target,
  TrendingUp,
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from "lucide-react"
import type { Goal, UserProfile } from "@/types/wallet"
import { cn, formatCurrency } from "@/lib/utils"
import { getGoalChallengeSummary, getGoalEffectiveProgress, getGoalEffectiveRemainingAmount } from "@/lib/goal-challenge"
import { formatAppDate } from "@/lib/app-calendar"
import { useCalendarSystem } from "@/hooks/use-calendar-system"

interface GoalProgressVisualizationProps {
  goals: Goal[]
  userProfile: UserProfile
}

interface GoalProjection {
  goal: Goal
  progress: number
  remaining: number
  timeToComplete: number
  monthlyNeeded: number
  projectedCompletion: Date
  status: 'on-track' | 'behind' | 'ahead' | 'completed'
}

export function GoalProgressVisualization({ goals, userProfile }: GoalProgressVisualizationProps) {
  const calendarSystem = useCalendarSystem()
  const goalProjections = useMemo(() => {
    return goals.map((goal): GoalProjection => {
      const challengeSummary = getGoalChallengeSummary(goal)
      const progress = getGoalEffectiveProgress(goal)
      const remaining = getGoalEffectiveRemainingAmount(goal)
      const targetDate = new Date(challengeSummary?.currentDeadline || goal.targetDate)
      const today = new Date()
      const daysRemaining = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      const monthsRemaining = Math.max(1, daysRemaining / 30)

      const monthlyNeeded = remaining / monthsRemaining
      const timeToComplete = monthlyNeeded > 0 ? remaining / monthlyNeeded : 0
      const projectedCompletion = new Date(today.getTime() + (timeToComplete * 30 * 24 * 60 * 60 * 1000))

      let status: GoalProjection['status'] = 'on-track'
      if (progress >= 100) status = 'completed'
      else if (projectedCompletion > targetDate) status = 'behind'
      else if (projectedCompletion < targetDate && progress > 50) status = 'ahead'

      return {
        goal,
        progress,
        remaining,
        timeToComplete,
        monthlyNeeded,
        projectedCompletion,
        status
      }
    })
  }, [goals])

  const getStatusBadgeClass = (status: GoalProjection['status']) => {
    switch (status) {
      case 'completed': return "bg-primary/15 text-primary border-primary/20"
      case 'ahead': return "bg-primary/10 text-primary border-primary/20"
      case 'on-track': return "bg-primary/10 text-primary border-primary/20"
      case 'behind': return "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
    }
  }

  const getStatusIcon = (status: GoalProjection['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-white" />
      case 'ahead': return <TrendingUp className="w-5 h-5 text-white" />
      case 'on-track': return <Target className="w-5 h-5 text-white" />
      case 'behind': return <AlertTriangle className="w-5 h-5 text-white" />
    }
  }

  const getStatusIconBg = (status: GoalProjection['status']) => {
    switch (status) {
      case 'completed': return "bg-primary"
      case 'ahead': return "bg-primary"
      case 'on-track': return "bg-primary"
      case 'behind': return "bg-amber-500"
    }
  }

  const formatTime = (months: number) => {
    if (months < 1) return `${Math.round(months * 30)} days`
    if (months < 12) return `${Math.round(months)} months`
    const years = Math.floor(months / 12)
    const remainingMonths = Math.round(months % 12)
    return `${years}y ${remainingMonths}m`
  }

  if (goals.length === 0) {
    return (
      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-30 text-primary" />
            <p className="text-lg font-medium">No goals to visualize</p>
            <p className="text-sm">Create financial goals to see progress here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalProgress = goals.reduce((sum, g) => sum + getGoalEffectiveProgress(g), 0) / goals.length
  const completedCount = goals.filter(g => getGoalEffectiveProgress(g) >= 100).length
  const behindCount = goalProjections.filter(g => g.status === 'behind').length
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Strategy Hub */}
        <Card className="lg:col-span-1 border-primary/10 overflow-hidden shadow-lg bg-background/50 backdrop-blur-sm flex flex-col">
          <CardHeader className="border-b border-primary/10 bg-primary/[0.02] py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                  <Target className="w-4 h-4" />
                </div>
                At a Glance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 border border-primary/10 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Goals</p>
                  <p className="text-xl font-bold font-mono text-primary">{goals.length}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="w-4 h-4 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-primary/5 border border-primary/15 rounded-xl">
                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Done</p>
                  <p className="text-lg font-bold font-mono text-primary">{completedCount}</p>
                </div>
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                    <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Behind</p>
                  <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{behindCount}</p>
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Total Savings Progress</p>
                <div className="flex items-end justify-between mb-1">
                  <p className="text-lg font-bold font-mono text-primary truncate mr-2">
                    {formatCurrency(totalSaved, userProfile.currency, userProfile.customCurrency)}
                  </p>
                  <p className="text-xs font-bold text-primary/70 shrink-0">
                    {Math.round(totalProgress)}%
                  </p>
                </div>
                <Progress
                  value={totalProgress}
                  className="h-1 bg-primary/10"
                  indicatorClassName="bg-primary"
                />
              </div>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-primary" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Tip</p>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                {behindCount > 0
                  ? "Focus on lagging goals to maintain overall momentum."
                  : "All active goals are on track  keep it up!"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Goal Cards */}
        <div className="lg:col-span-3 space-y-4">
          {goalProjections.map((projection) => (
            <Card key={projection.goal.id} className="border-primary/10 overflow-hidden shadow-lg bg-background/40 backdrop-blur-md transition-all hover:shadow-primary/10 group/card">
              <div className="flex flex-col md:flex-row">
                {/* Left: Status & Progress */}
                <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-primary/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "p-1.5 rounded-lg text-white shadow-sm shrink-0 transition-transform group-hover/card:scale-110",
                        getStatusIconBg(projection.status)
                      )}>
                        {getStatusIcon(projection.status)}
                      </div>
                      <h3 className="text-sm font-bold truncate">
                        {projection.goal.title || projection.goal.name}
                      </h3>
                      <Badge variant="outline" className={cn("text-[8px] font-bold uppercase tracking-widest px-1.5 py-0 shrink-0", getStatusBadgeClass(projection.status))}>
                        {projection.status.replace('-', ' ')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                        <Calendar className="w-2.5 h-2.5" /> {formatAppDate(projection.goal.targetDate, calendarSystem)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-primary leading-none shrink-0">
                      {projection.progress.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-0.5">%</span>
                    </p>
                  </div>

                  {/* Progress Bar with Milestones */}
                  <div className="space-y-8">
                    <div className="relative pt-1 px-1">
                      <div className="absolute top-[-4px] left-0 w-full h-full pointer-events-none px-1">
                        {[25, 50, 75].map((m) => (
                          <div
                            key={m}
                            className={cn(
                              "absolute w-[1px] h-[16px] -translate-x-1/2 transition-colors",
                              projection.progress >= m ? "bg-primary" : "bg-muted-foreground/30"
                            )}
                            style={{ left: `${m}%` }}
                          >
                            <div className={cn(
                              "absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                              projection.progress >= m ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-muted-foreground/30"
                            )} />
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-muted-foreground/60">{m}%</span>
                          </div>
                        ))}
                      </div>

                      <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden border border-primary/10">
                        <div
                          className={cn(
                            "h-full transition-all duration-1000 ease-out rounded-full",
                            projection.status === 'behind' ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${Math.min(projection.progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/20 rounded-xl border border-dashed border-primary/10">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Still Needed</p>
                        <p className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                          {formatCurrency(projection.remaining, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-xl border border-dashed border-primary/10">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Monthly Plan</p>
                        <p className="text-sm font-bold font-mono text-primary">
                          {formatCurrency(projection.monthlyNeeded, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Intelligence & Projections */}
                <div className="w-full md:w-64 lg:w-72 bg-muted/10 p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Zap className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Insight</span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-background/50 rounded-xl border border-primary/10">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Est. Completion</p>
                        <p className="text-sm font-bold font-mono text-primary">
                          {formatAppDate(projection.projectedCompletion, calendarSystem)}
                          <span className="text-[10px] font-normal text-muted-foreground ml-2">({formatTime(projection.timeToComplete)})</span>
                        </p>
                        <p className="text-[8px] text-muted-foreground italic mt-1 font-medium">
                          {projection.status === 'ahead' ? 'Ahead of schedule' :
                            projection.status === 'behind' ? 'Needs attention to meet deadline' : 'On track'}
                        </p>
                      </div>

                      <div className={cn(
                        "p-3 rounded-xl border text-[10px] leading-relaxed font-medium",
                        projection.status === 'ahead' ? "bg-primary/5 border-primary/15 text-primary" :
                          projection.status === 'behind' ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300" :
                            "bg-primary/5 border-primary/10 text-muted-foreground"
                      )}>
                        {projection.status === 'ahead' ? 'You are ahead of schedule. Consider increasing your target or completing early.' :
                          projection.status === 'behind' ? `Increase monthly savings by ~20% to meet your original deadline.` :
                            'On track. Keep saving at the current rate.'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-primary/10 mt-4 flex items-center justify-between">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Pace</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-3 rounded-full transition-all duration-500",
                            i <= (projection.progress > 0 ? Math.ceil(projection.progress / 20) : 1)
                              ? projection.status === 'behind' ? "bg-amber-400" : "bg-primary"
                              : "bg-muted-foreground/20"
                          )}
                          style={{ transitionDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
