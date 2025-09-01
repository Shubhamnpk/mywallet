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
  AlertTriangle
} from "lucide-react"
import type { Goal, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

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
      case 'on-track': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'behind': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getStatusIcon = (status: GoalProjection['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5" />
      case 'ahead': return <TrendingUp className="w-5 h-5" />
      case 'on-track': return <Target className="w-5 h-5" />
      case 'behind': return <AlertTriangle className="w-5 h-5" />
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
      {/* Overall Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Goal Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{goals.length}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Total Goals</p>
            </div>
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">
                {goalProjections.filter(g => g.status === 'completed').length}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Completed</p>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">
                {goalProjections.filter(g => g.status === 'on-track').length}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">On Track</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {goalProjections.filter(g => g.status === 'behind').length}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">Behind Schedule</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Goal Progress */}
      <div className="grid gap-6">
        {goalProjections.map((projection) => (
          <Card key={projection.goal.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  {getStatusIcon(projection.status)}
                  {projection.goal.title || projection.goal.name}
                  <Badge className={getStatusColor(projection.status)}>
                    {projection.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </CardTitle>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {projection.progress.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={projection.progress} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {formatCurrency(projection.goal.currentAmount, userProfile.currency, userProfile.customCurrency)}
                  </span>
                  <span>
                    {formatCurrency(projection.goal.targetAmount, userProfile.currency, userProfile.customCurrency)}
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="font-semibold text-amber-600">
                    {formatCurrency(projection.remaining, userProfile.currency, userProfile.customCurrency)}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Monthly Needed</p>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(projection.monthlyNeeded, userProfile.currency, userProfile.customCurrency)}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Time to Complete</p>
                  <p className="font-semibold text-purple-600">
                    {formatTime(projection.timeToComplete)}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Target Date</p>
                  <p className="font-semibold text-emerald-600">
                    {new Date(projection.goal.targetDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Milestones
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {projection.milestones.map((milestone) => (
                    <div
                      key={milestone.percentage}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        milestone.achieved
                          ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                          : 'bg-muted/30 border-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1 rounded ${
                          milestone.achieved ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          {milestone.icon}
                        </div>
                        <span className="text-xs font-medium">{milestone.percentage}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{milestone.label}</p>
                      <p className={`text-sm font-semibold ${
                        milestone.achieved ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}>
                        {formatCurrency(milestone.amount, userProfile.currency, userProfile.customCurrency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projection Insights */}
              {projection.status !== 'completed' && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Projection Insights
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 mb-1">Projected Completion</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {projection.projectedCompletion.toLocaleDateString()}
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-400">
                        Based on current savings rate
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 mb-1">Status</p>
                      <p className={`font-semibold ${
                        projection.status === 'ahead' ? 'text-emerald-600' :
                        projection.status === 'behind' ? 'text-red-600' :
                        'text-amber-600'
                      }`}>
                        {projection.status === 'ahead' ? 'Ahead of Schedule' :
                         projection.status === 'behind' ? 'Behind Schedule' :
                         'On Track'}
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-400">
                        {projection.status === 'ahead' ? 'Great progress!' :
                         projection.status === 'behind' ? 'Consider increasing contributions' :
                         'Keep up the good work'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}