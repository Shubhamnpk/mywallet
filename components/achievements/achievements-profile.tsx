"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Trophy,
  Gift,
  Sparkles,
  CheckCircle2,
  PartyPopper
} from "lucide-react"
import type { Achievement } from "@/types/wallet"

interface AchievementsProfileProps {
  achievements: Achievement[]
  unlockedAchievements: Achievement[]
  lockedAchievements: Achievement[]
  celebration: {
    show: boolean
    achievement: Achievement | null
  }
  onDismissCelebration: () => void
}

export function AchievementsProfile({
  achievements,
  unlockedAchievements,
  lockedAchievements,
  celebration,
  onDismissCelebration
}: AchievementsProfileProps) {
  const getAchievementCategory = (achievement: Achievement) => {
    return achievement.category
  }

  return (
    <div className="space-y-6">
      {/* Achievement Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievement Profile
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
                {achievements.length > 0 ? Math.round((unlockedAchievements.length / achievements.length) * 100) : 0}%
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
      <Dialog open={celebration.show} onOpenChange={onDismissCelebration}>
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

              <Button
                onClick={onDismissCelebration}
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