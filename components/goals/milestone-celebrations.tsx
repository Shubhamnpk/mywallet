"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Trophy,
  Star,
  Award,
  Target,
  Zap,
  Crown,
  Medal,
  Gift,
  Sparkles,
  PartyPopper,
  CheckCircle2,
  Flame
} from "lucide-react"
import type { Goal, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface MilestoneCelebrationsProps {
  goals: Goal[]
  userProfile: UserProfile
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  unlocked: boolean
  unlockedAt?: Date
  goalId?: string
  progress: number
  maxProgress: number
}

interface CelebrationData {
  show: boolean
  achievement: Achievement | null
  goal?: Goal
}

export function MilestoneCelebrations({ goals, userProfile }: MilestoneCelebrationsProps) {
  const [celebration, setCelebration] = useState<CelebrationData>({ show: false, achievement: null })
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    const calculateAchievements = () => {
      const newAchievements: Achievement[] = []

      goals.forEach((goal) => {
        const progress = (goal.currentAmount / goal.targetAmount) * 100

        // Progress-based achievements
        const progressMilestones = [
          { threshold: 25, title: "First Steps", description: "Reached 25% of your goal", icon: <Target className="w-5 h-5" />, color: "text-blue-600 bg-blue-50" },
          { threshold: 50, title: "Halfway Hero", description: "Reached 50% of your goal", icon: <Star className="w-5 h-5" />, color: "text-amber-600 bg-amber-50" },
          { threshold: 75, title: "Almost There", description: "Reached 75% of your goal", icon: <Award className="w-5 h-5" />, color: "text-purple-600 bg-purple-50" },
          { threshold: 100, title: "Goal Crusher", description: "Completed your goal!", icon: <Trophy className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-50" }
        ]

        progressMilestones.forEach((milestone) => {
          const achievementId = `${goal.id}_${milestone.threshold}`
          const existingAchievement = achievements.find(a => a.id === achievementId)
          const isUnlocked = progress >= milestone.threshold
          const wasLocked = !existingAchievement?.unlocked

          newAchievements.push({
            id: achievementId,
            title: milestone.title,
            description: `${milestone.description} - ${goal.title || goal.name}`,
            icon: milestone.icon,
            color: milestone.color,
            unlocked: isUnlocked,
            unlockedAt: isUnlocked && wasLocked ? new Date() : existingAchievement?.unlockedAt,
            goalId: goal.id,
            progress: Math.min(progress, milestone.threshold),
            maxProgress: milestone.threshold
          })

          // Trigger celebration for newly unlocked achievements
          if (isUnlocked && wasLocked && !celebration.show) {
            setTimeout(() => {
              setCelebration({
                show: true,
                achievement: {
                  ...newAchievements[newAchievements.length - 1],
                  unlockedAt: new Date()
                },
                goal
              })
            }, 1000)
          }
        })
      })

      // Global achievements
      const totalGoals = goals.length
      const completedGoals = goals.filter(g => (g.currentAmount / g.targetAmount) * 100 >= 100).length
      const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0)
      const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)
      const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

      const globalAchievements = [
        {
          id: "first_goal",
          title: "Goal Setter",
          description: "Created your first financial goal",
          icon: <Target className="w-5 h-5" />,
          color: "text-blue-600 bg-blue-50",
          unlocked: totalGoals >= 1,
          progress: Math.min(totalGoals, 1),
          maxProgress: 1
        },
        {
          id: "goal_collector",
          title: "Goal Collector",
          description: "Created 5 or more financial goals",
          icon: <Star className="w-5 h-5" />,
          color: "text-amber-600 bg-amber-50",
          unlocked: totalGoals >= 5,
          progress: Math.min(totalGoals, 5),
          maxProgress: 5
        },
        {
          id: "first_completion",
          title: "First Victory",
          description: "Completed your first goal",
          icon: <Trophy className="w-5 h-5" />,
          color: "text-emerald-600 bg-emerald-50",
          unlocked: completedGoals >= 1,
          progress: Math.min(completedGoals, 1),
          maxProgress: 1
        },
        {
          id: "goal_master",
          title: "Goal Master",
          description: "Completed 10 goals",
          icon: <Crown className="w-5 h-5" />,
          color: "text-purple-600 bg-purple-50",
          unlocked: completedGoals >= 10,
          progress: Math.min(completedGoals, 10),
          maxProgress: 10
        },
        {
          id: "saving_champion",
          title: "Saving Champion",
          description: "Saved over $10,000 across all goals",
          icon: <Medal className="w-5 h-5" />,
          color: "text-orange-600 bg-orange-50",
          unlocked: totalSaved >= 10000,
          progress: Math.min(totalSaved, 10000),
          maxProgress: 10000
        },
        {
          id: "consistency_king",
          title: "Consistency King",
          description: "Maintained goals for over a year",
          icon: <Flame className="w-5 h-5" />,
          color: "text-red-600 bg-red-50",
          unlocked: goals.some(g => {
            const createdDate = new Date(g.createdAt)
            const now = new Date()
            const diffTime = Math.abs(now.getTime() - createdDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays >= 365
          }),
          progress: 1,
          maxProgress: 1
        }
      ]

      globalAchievements.forEach((achievement) => {
        const existingAchievement = achievements.find(a => a.id === achievement.id)
        const isUnlocked = achievement.unlocked
        const wasLocked = !existingAchievement?.unlocked

        newAchievements.push({
          ...achievement,
          unlockedAt: isUnlocked && wasLocked ? new Date() : existingAchievement?.unlockedAt
        })

        // Trigger celebration for newly unlocked global achievements
        if (isUnlocked && wasLocked && !celebration.show) {
          setTimeout(() => {
            setCelebration({
              show: true,
              achievement: {
                ...achievement,
                unlockedAt: new Date()
              }
            })
          }, 1000)
        }
      })

      setAchievements(newAchievements)
    }

    calculateAchievements()
  }, [goals, celebration.show])

  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const lockedAchievements = achievements.filter(a => !a.unlocked)

  const getAchievementCategory = (achievement: Achievement) => {
    if (achievement.goalId) return "Goal Progress"
    if (achievement.id.includes("goal")) return "Goal Setting"
    if (achievement.id.includes("saving")) return "Savings"
    if (achievement.id.includes("consistency")) return "Consistency"
    return "General"
  }

  return (
    <div className="space-y-6">
      {/* Achievement Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievement Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">{unlockedAchievements.length}</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Unlocked</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{lockedAchievements.length}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Available</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Completion</p>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">
                {new Set(unlockedAchievements.map(a => getAchievementCategory(a))).size}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">Categories</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Unlocked Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {unlockedAchievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
                  <div className={`p-3 rounded-full ${achievement.color.split(' ')[1]} border ${achievement.color.split(' ')[2]}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      {achievement.title}
                      <Badge variant="secondary" className="text-xs">
                        {getAchievementCategory(achievement)}
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    {achievement.unlockedAt && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Unlocked {achievement.unlockedAt.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Achievements */}
      {lockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Available Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {lockedAchievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-4 p-4 border rounded-lg opacity-75">
                  <div className="p-3 rounded-full bg-muted border">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      {achievement.title}
                      <Badge variant="outline" className="text-xs">
                        {getAchievementCategory(achievement)}
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{achievement.progress}/{achievement.maxProgress}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Celebration Dialog */}
      <Dialog open={celebration.show} onOpenChange={(open) => setCelebration({ ...celebration, show: open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-center">
              <PartyPopper className="w-6 h-6 text-emerald-600" />
              Achievement Unlocked!
            </DialogTitle>
          </DialogHeader>

          {celebration.achievement && (
            <div className="text-center space-y-4">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${celebration.achievement.color.split(' ')[1]} border-4 ${celebration.achievement.color.split(' ')[2]}`}>
                {celebration.achievement.icon}
              </div>

              <div>
                <h3 className="text-xl font-bold text-primary">{celebration.achievement.title}</h3>
                <p className="text-muted-foreground">{celebration.achievement.description}</p>
              </div>

              {celebration.goal && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Related Goal</p>
                  <p className="font-semibold">{celebration.goal.title || celebration.goal.name}</p>
                  <p className="text-sm text-emerald-600">
                    {formatCurrency(celebration.goal.currentAmount, userProfile.currency, userProfile.customCurrency)} saved
                  </p>
                </div>
              )}

              <Button
                onClick={() => setCelebration({ show: false, achievement: null })}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Continue Your Journey
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}