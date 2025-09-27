"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Achievement } from "@/types/wallet"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Trophy,
  Gift,
  Sparkles,
  CheckCircle2,
  PartyPopper,
  Award,
  Star,
  Flame,
  Crown,
  Target,
  Zap,
  Gem,
  Medal,
  Shield,
  Rocket,
  Heart,
  Brain,
  Gamepad2,
  Lock,
  TrendingUp
} from "lucide-react"

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

// Custom Circular Progress Component
const CircularProgressBar = ({
  progress,
  maxProgress,
  size = 180,
  strokeWidth = 12,
  children,
  isUnlocked = false,
  rarity = "common"
}: {
  progress: number
  maxProgress: number
  size?: number
  strokeWidth?: number
  children: React.ReactNode
  isUnlocked?: boolean
  rarity?: "common" | "rare" | "epic" | "legendary"
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / maxProgress) * circumference

  const getProgressColor = () => {
    if (isUnlocked) return "#10b981" // emerald-500
    const percentage = (progress / maxProgress) * 100
    if (percentage >= 75) return "#8b5cf6" // violet-500
    if (percentage >= 50) return "#3b82f6" // blue-500
    if (percentage >= 25) return "#eab308" // yellow-500
    return "#64748b" // slate-500
  }

  const getRarityGradient = () => {
    switch (rarity) {
      case 'legendary': return 'url(#legendary-gradient)'
      case 'epic': return 'url(#epic-gradient)'
      case 'rare': return 'url(#rare-gradient)'
      default: return 'url(#common-gradient)'
    }
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="legendary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="epic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="rare-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="common-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200 dark:text-slate-700"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isUnlocked ? getRarityGradient() : getProgressColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
      
      {/* Progress percentage */}
      {!isUnlocked && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            {Math.round((progress / maxProgress) * 100)}%
          </div>
        </div>
      )}
    </div>
  )
}

// Achievement Card Component
const AchievementCard = ({ achievement, onClick }: { achievement: Achievement, onClick: () => void }) => {
  const isUnlocked = achievement.unlocked
  
  const getRarityStyles = () => {
    if (!isUnlocked) return "from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700"
    
    switch (achievement.rarity) {
      case 'legendary':
        return "from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-700"
      case 'epic':
        return "from-purple-50 via-violet-50 to-fuchsia-50 dark:from-purple-950/30 dark:via-violet-950/30 dark:to-fuchsia-950/30 border-purple-300 dark:border-purple-700"
      case 'rare':
        return "from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-blue-300 dark:border-blue-700"
      default:
        return "from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 border-gray-300 dark:border-gray-700"
    }
  }

  const getIconStyles = () => {
    if (!isUnlocked) return "text-slate-400 dark:text-slate-500"
    
    switch (achievement.rarity) {
      case 'legendary': return "text-amber-600 dark:text-amber-400"
      case 'epic': return "text-purple-600 dark:text-purple-400"
      case 'rare': return "text-blue-600 dark:text-blue-400"
      default: return "text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all duration-300 hover:scale-105"
    >
      <CircularProgressBar
        progress={achievement.progress}
        maxProgress={achievement.maxProgress}
        size={180}
        strokeWidth={12}
        isUnlocked={isUnlocked}
        rarity={achievement.rarity}
      >
        <div className="flex flex-col items-center space-y-1">
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            ${isUnlocked ? 'bg-white/80 dark:bg-slate-900/80' : 'bg-slate-100 dark:bg-slate-800'}
            shadow-inner
          `}>
            <div className={`text-4xl ${getIconStyles()} transition-all group-hover:scale-110`}>
              {achievement.icon}
            </div>
          </div>
          <h3 className="font-bold text-sm text-center text-slate-800 dark:text-slate-200 line-clamp-2 px-1">
            {achievement.title}
          </h3>
          <div className="flex gap-1 justify-center flex-wrap">
            <Badge
              variant={isUnlocked ? "default" : "outline"}
              className="text-[10px] px-2 py-0"
            >
              {achievement.category}
            </Badge>
            {isUnlocked && (
              <Badge
                className={`text-[10px] px-2 py-0 capitalize ${
                  achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  achievement.rarity === 'epic' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                  achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                  'bg-gradient-to-r from-gray-500 to-slate-500'
                } text-white border-0`}
              >
                {achievement.rarity}
              </Badge>
            )}
          </div>
        </div>
      </CircularProgressBar>
    </div>
  )
}

export function AchievementsProfile({
  achievements,
  unlockedAchievements,
  lockedAchievements,
  celebration,
  onDismissCelebration
}: AchievementsProfileProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [filter, setFilter] = useState("all")
  const isMobile = useIsMobile()

  const categories = Array.from(new Set(achievements.map(a => a.category)))

  const filteredUnlocked = filter === "all" 
    ? unlockedAchievements 
    : unlockedAchievements.filter(a => a.category === filter)

  const filteredLocked = filter === "all" 
    ? lockedAchievements 
    : lockedAchievements.filter(a => a.category === filter)

  const totalProgress = achievements.reduce((acc, a) => acc + a.progress, 0)
  const totalMaxProgress = achievements.reduce((acc, a) => acc + a.maxProgress, 0)
  const overallPercentage = totalMaxProgress > 0 ? Math.round((totalProgress / totalMaxProgress) * 100) : 0

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header with Overall Progress */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <Trophy className="w-8 h-8" />
                <h1 className="text-3xl font-bold">Achievements</h1>
              </div>
              <p className="text-white/90">Track your journey and unlock rewards</p>
            </div>
            
            {/* Overall Progress Circle */}
            <CircularProgressBar
              progress={totalProgress}
              maxProgress={totalMaxProgress}
              size={120}
              strokeWidth={8}
              isUnlocked={false}
            >
              <div className="text-center">
                <div className="text-3xl font-bold">{overallPercentage}%</div>
                <div className="text-xs opacity-90">Complete</div>
              </div>
            </CircularProgressBar>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-300 dark:border-emerald-700">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{unlockedAchievements.length}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">Unlocked</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-300 dark:border-blue-700">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{lockedAchievements.length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500">In Progress</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-300 dark:border-purple-700">
          <CardContent className="p-4 text-center">
            <Medal className="w-6 h-6 mx-auto mb-1 text-purple-600" />
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{categories.length}</p>
            <p className="text-xs text-purple-600 dark:text-purple-500">Categories</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-300 dark:border-amber-700">
          <CardContent className="p-4 text-center">
            <Gem className="w-6 h-6 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {unlockedAchievements.filter(a => a.rarity === 'legendary' || a.rarity === 'epic').length}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">Rare Finds</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          size="sm"
          className="rounded-full"
        >
          All
        </Button>
        {categories.map(category => (
          <Button
            key={category}
            variant={filter === category ? "default" : "outline"}
            onClick={() => setFilter(category)}
            size="sm"
            className="rounded-full capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="space-y-8">
        {/* Unlocked Section */}
        {filteredUnlocked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Unlocked Achievements
              </h2>
              <Badge className="ml-2 bg-emerald-600 text-white">
                {filteredUnlocked.length}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {filteredUnlocked.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => !isMobile && setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Locked Section */}
        {filteredLocked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                In Progress
              </h2>
              <Badge className="ml-2 bg-blue-600 text-white">
                {filteredLocked.length}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {filteredLocked.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => !isMobile && setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievement Detail Dialog */}
      <Dialog open={!!selectedAchievement && !isMobile} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Achievement Details</DialogTitle>
          </DialogHeader>

          {selectedAchievement ? (
            <div className="flex flex-col items-center space-y-4 py-4">
              <CircularProgressBar
                progress={selectedAchievement.progress}
                maxProgress={selectedAchievement.maxProgress}
                size={180}
                strokeWidth={12}
                isUnlocked={selectedAchievement.unlocked}
                rarity={selectedAchievement.rarity}
              >
                <div className={`
                  w-28 h-28 rounded-full flex items-center justify-center
                  ${selectedAchievement.unlocked ? 'bg-white dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}
                  shadow-inner
                `}>
                  <div className="text-6xl">
                    {selectedAchievement.icon}
                  </div>
                </div>
              </CircularProgressBar>
              
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold">{selectedAchievement.title}</h3>
                <p className="text-muted-foreground">{selectedAchievement.description}</p>
                
                <div className="flex gap-2 justify-center">
                  <Badge>{selectedAchievement.category}</Badge>
                  {selectedAchievement.unlocked && (
                    <Badge className="capitalize">{selectedAchievement.rarity}</Badge>
                  )}
                </div>
                
                {!selectedAchievement.unlocked && (
                  <div className="pt-2">
                    <div className="text-sm font-medium mb-2">
                      Progress: {selectedAchievement.progress} / {selectedAchievement.maxProgress}
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${(selectedAchievement.progress / selectedAchievement.maxProgress) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => setSelectedAchievement(null)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Celebration Dialog */}
      <Dialog open={celebration.show && !isMobile} onOpenChange={onDismissCelebration}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
              <PartyPopper className="w-6 h-6 text-amber-500" />
              Achievement Unlocked!
              <PartyPopper className="w-6 h-6 text-amber-500" />
            </DialogTitle>
          </DialogHeader>
          
          {celebration.achievement && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="relative">
                <CircularProgressBar
                  progress={celebration.achievement.maxProgress}
                  maxProgress={celebration.achievement.maxProgress}
                  size={200}
                  strokeWidth={14}
                  isUnlocked={true}
                  rarity={celebration.achievement.rarity}
                >
                  <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-inner">
                    <div className="text-7xl animate-bounce">
                      {celebration.achievement.icon}
                    </div>
                  </div>
                </CircularProgressBar>
                <div className="absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }}>
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                </div>
              </div>
              
              <div className="text-center space-y-3">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {celebration.achievement.title}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {celebration.achievement.description}
                </p>
                
                <div className="flex gap-2 justify-center">
                  <Badge className="text-sm py-1 px-3">
                    {celebration.achievement.category}
                  </Badge>
                  <Badge className="text-sm py-1 px-3 capitalize bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                    {celebration.achievement.rarity}
                  </Badge>
                </div>
              </div>
              
              <Button 
                onClick={onDismissCelebration}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Continue Your Journey
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}