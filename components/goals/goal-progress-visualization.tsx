"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Trophy,
  Star,
  Award,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from "lucide-react"
import type { Goal, UserProfile } from "@/types/wallet"
import { cn, formatCurrency } from "@/lib/utils"

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
  milestones: Milestone[]
}

interface Milestone {
  percentage: number
  amount: number
  achieved: boolean
  label: string
  icon: React.ReactNode
}

export function GoalProgressVisualization({ goals, userProfile }: GoalProgressVisualizationProps) {
  const goalProjections = useMemo(() => {
    return goals.map((goal): GoalProjection => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100
      const remaining = goal.targetAmount - goal.currentAmount
      const targetDate = new Date(goal.targetDate)
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

      const milestones: Milestone[] = [
        {
          percentage: 25,
          amount: goal.targetAmount * 0.25,
          achieved: progress >= 25,
          label: "Quarter Complete",
          icon: <Star className="w-4 h-4" />
        },
        {
          percentage: 50,
          amount: goal.targetAmount * 0.5,
          achieved: progress >= 50,
          label: "Halfway There",
          icon: <Target className="w-4 h-4" />
        },
        {
          percentage: 75,
          amount: goal.targetAmount * 0.75,
          achieved: progress >= 75,
          label: "Three Quarters",
          icon: <Award className="w-4 h-4" />
        },
        {
          percentage: 100,
          amount: goal.targetAmount,
          achieved: progress >= 100,
          label: "Goal Complete!",
          icon: <Trophy className="w-4 h-4" />
        }
      ]

      return {
        goal,
        progress,
        remaining,
        timeToComplete,
        monthlyNeeded,
        projectedCompletion,
        status,
        milestones
      }
    })
  }, [goals])

  const getStatusColor = (status: GoalProjection['status']) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'ahead': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'on-track': return 'text-primary bg-primary/50 border-primary/20'
      case 'behind': return 'text-amber-600 bg-amber-50 border-amber-200'
    }
  }

  const getStatusIcon = (status: GoalProjection['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-success" />
      case 'ahead': return <TrendingUp className="w-5 h-5 text-info" />
      case 'on-track': return <Target className="w-5 h-5 text-primary" />
      case 'behind': return <AlertTriangle className="w-5 h-5 text-error" />
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Goal Progress Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No goals to visualize</p>
            <p className="text-sm">Create some financial goals to see progress visualizations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Strategy Hub - Left Side/Top */}
        <Card className="lg:col-span-1 border-primary/10 overflow-hidden shadow-xl bg-background/50 backdrop-blur-sm flex flex-col">
          <CardHeader className="border-b bg-muted/30 py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                  <Target className="w-4 h-4" />
                </div>
                Strategy Hub
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/20 border border-muted/50 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Goals</p>
                  <p className="text-xl font-bold font-mono text-primary">{goals.length}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="w-4 h-4 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Done</p>
                  <p className="text-lg font-bold font-mono text-emerald-600">
                    {goals.filter(g => (g.currentAmount / g.targetAmount) * 100 >= 100).length}
                  </p>
                </div>
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-xl">
                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Lagging</p>
                  <p className="text-lg font-bold font-mono text-amber-600">
                    {goalProjections.filter(g => g.status === 'behind').length}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/20 rounded-xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Total Savings Progress</p>
                <div className="flex items-end justify-between mb-1">
                  <p className="text-lg font-bold font-mono text-blue-600 truncate mr-2">
                    {formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0), userProfile.currency, userProfile.customCurrency)}
                  </p>
                  <p className="text-xs font-bold text-blue-600/70 shrink-0">
                    {Math.round(goals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount) * 100, 0) / goals.length) || 0}%
                  </p>
                </div>
                <Progress
                  value={goals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount) * 100, 0) / goals.length || 0}
                  className="h-1 bg-blue-100 dark:bg-blue-900/30"
                />
              </div>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-primary" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Intelligence</p>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                {goalProjections.filter(g => g.status === 'behind').length > 0
                  ? "Your trajectory suggests focusing on 'Lagging' goals to maintain overall momentum."
                  : "Excellent coverage! All active goals are performing within projected parameters."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Individual Goal View - Right Side/Main */}
        <div className="lg:col-span-3 space-y-4">
          {goalProjections.map((projection) => (
            <Card key={projection.goal.id} className="border-primary/10 overflow-hidden shadow-lg bg-background/40 backdrop-blur-md transition-all hover:shadow-primary/5 group/card">
              <div className="flex flex-col md:flex-row">
                {/* Left Section: Status & Progress */}
                <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-primary/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg text-white shadow-sm transition-transform group-hover/card:scale-110",
                        projection.status === 'completed' ? 'bg-emerald-500' :
                          projection.status === 'ahead' ? 'bg-blue-500' :
                            projection.status === 'behind' ? 'bg-amber-500' : 'bg-primary'
                      )}>
                        {getStatusIcon(projection.status)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold leading-none mb-1.5">
                          {projection.goal.title || projection.goal.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[8px] font-bold uppercase tracking-widest h-3.5 px-1", getStatusColor(projection.status))}>
                            {projection.status.replace('-', ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" /> {new Date(projection.goal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono text-primary leading-none">
                        {projection.progress.toFixed(1)}<span className="text-sm font-normal opacity-70 ml-0.5">%</span>
                      </p>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar with Milestones */}
                  <div className="space-y-8">
                    <div className="relative pt-1 px-1">
                      {/* Milestone Markers */}
                      <div className="absolute top-[-4px] left-0 w-full h-full pointer-events-none z-10 px-1">
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
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold opacity-40">{m}%</span>
                          </div>
                        ))}
                      </div>

                      <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden border border-primary/5 relative">
                        <div
                          className={cn(
                            "h-full transition-all duration-1000 ease-out",
                            projection.status === 'completed' ? 'bg-emerald-500' : 'bg-primary',
                            projection.status === 'behind' && 'bg-amber-500'
                          )}
                          style={{ width: `${Math.min(projection.progress, 100)}%` }}
                        />
                        {projection.progress < 100 && (
                          <div
                            className="absolute top-0 right-0 h-full bg-primary/5 animate-pulse"
                            style={{ width: `${100 - Math.min(projection.progress, 100)}%` }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/10 rounded-xl border border-dashed border-primary/10">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Still Needed</p>
                        <p className="text-sm font-bold font-mono text-red-500/80">
                          {formatCurrency(projection.remaining, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-xl border border-dashed border-primary/10">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Monthly Plan</p>
                        <p className="text-sm font-bold font-mono text-blue-600/80">
                          {formatCurrency(projection.monthlyNeeded, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section: Intelligence & Projections */}
                <div className="w-full md:w-64 lg:w-72 bg-muted/10 p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Zap className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Strategic Insight</span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-background/50 rounded-xl border border-primary/5">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mb-1">Est. Completion</p>
                        <p className="text-sm font-bold font-mono text-primary">
                          {projection.projectedCompletion.toLocaleDateString()}
                          <span className="text-[10px] font-normal opacity-60 ml-2">({formatTime(projection.timeToComplete)})</span>
                        </p>
                        <p className="text-[8px] text-muted-foreground italic mt-1 font-medium">
                          {projection.status === 'ahead' ? 'Running ahead of original schedule' :
                            projection.status === 'behind' ? 'Action required to meet deadline' : 'Aligned with target schedule'}
                        </p>
                      </div>

                      <div className={cn(
                        "p-3 rounded-xl border text-[10px] leading-relaxed font-medium",
                        projection.status === 'ahead' ? 'bg-emerald-50/50 border-emerald-200/50 text-emerald-700/80' :
                          projection.status === 'behind' ? 'bg-amber-50/50 border-amber-200/50 text-amber-700/80' :
                            'bg-blue-50/50 border-blue-200/50 text-blue-700/80'
                      )}>
                        {projection.status === 'ahead' ? 'Velocity is high. You could potentially increase your target or complete early.' :
                          projection.status === 'behind' ? `Warning: You need to increase monthly savings by approx 20% to hit original target.` :
                            'Stable trajectory. Maintain current savings levels to achieve target on time.'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-primary/10 mt-4 flex items-center justify-between">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Velocity Index</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-3 rounded-full transition-all duration-500",
                            i <= (projection.progress > 0 ? Math.ceil(projection.progress / 20) : 1)
                              ? projection.status === 'behind' ? "bg-amber-400" : "bg-primary"
                              : "bg-muted"
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