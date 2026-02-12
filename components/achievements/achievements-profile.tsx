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

// Custom Circular Progress Component with Premium Styling
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
  const progressPercent = Math.min((progress / maxProgress) * 100, 100)
  const offset = circumference - (progressPercent / 100) * circumference

  const getRarityGradient = () => {
    switch (rarity) {
      case 'legendary': return 'url(#legendary-gradient)'
      case 'epic': return 'url(#epic-gradient)'
      case 'rare': return 'url(#rare-gradient)'
      default: return 'url(#common-gradient)'
    }
  }

  const getGlowColor = () => {
    if (!isUnlocked) return "transparent"
    switch (rarity) {
      case 'legendary': return "rgba(245, 158, 11, 0.4)"
      case 'epic': return "rgba(139, 92, 246, 0.4)"
      case 'rare': return "rgba(59, 130, 246, 0.4)"
      default: return "rgba(148, 163, 184, 0.4)"
    }
  }

  return (
    <div className="relative inline-flex items-center justify-center group">
      {/* Outer Glow for Legendary/Epic */}
      {isUnlocked && (rarity === 'legendary' || rarity === 'epic') && (
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ backgroundColor: getGlowColor() }}
        />
      )}

      <svg width={size} height={size} className="transform -rotate-90 relative z-10 transition-transform duration-500 group-hover:scale-105">
        <defs>
          <linearGradient id="legendary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="epic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
          <linearGradient id="rare-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="common-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200/50 dark:text-slate-800/50"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isUnlocked ? getRarityGradient() : "currentColor"}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={isUnlocked ? "url(#glow)" : "none"}
          className={`transition-all duration-1000 ease-in-out ${!isUnlocked && 'text-slate-300 dark:text-slate-700'}`}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        {children}
      </div>

      {/* Progress percentage overlay for locked ones */}
      {!isUnlocked && progressPercent > 0 && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-slate-700">
            {Math.round(progressPercent)}%
          </div>
        </div>
      )}
    </div>
  )
}

// Achievement Card Component
const AchievementCard = ({ achievement, onClick }: { achievement: Achievement, onClick: () => void }) => {
  const isUnlocked = achievement.unlocked

  const getIconStyles = () => {
    if (!isUnlocked) return "text-slate-400 dark:text-slate-600 grayscale opacity-50"

    switch (achievement.rarity) {
      case 'legendary': return "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
      case 'epic': return "text-purple-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]"
      case 'rare': return "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
      default: return "text-slate-600 dark:text-slate-400"
    }
  }

  const getRarityBorder = () => {
    if (!isUnlocked) return "border-transparent"
    switch (achievement.rarity) {
      case 'legendary': return "border-amber-500/30"
      case 'epic': return "border-purple-500/30"
      case 'rare': return "border-blue-500/30"
      default: return "border-slate-300 dark:border-slate-700"
    }
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative group cursor-pointer p-4 rounded-3xl transition-all duration-500
        hover:bg-white dark:hover:bg-slate-900 border
        ${getRarityBorder()}
        ${isUnlocked ? 'bg-slate-50/50 dark:bg-slate-900/30 shadow-sm' : 'bg-transparent border-transparent opacity-80 hover:opacity-100'}
      `}
    >
      <div className="flex flex-col items-center space-y-4">
        <CircularProgressBar
          progress={achievement.progress}
          maxProgress={achievement.maxProgress}
          size={140}
          strokeWidth={10}
          isUnlocked={isUnlocked}
          rarity={achievement.rarity}
        >
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            ${isUnlocked ? 'bg-white dark:bg-slate-800' : 'bg-slate-100/50 dark:bg-slate-800/50'}
            shadow-inner relative overflow-hidden group-hover:scale-110 transition-transform duration-500
          `}>
            {/* Background pattern for icons */}
            {isUnlocked && (
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <Sparkles className="w-full h-full p-2" />
              </div>
            )}
            <div className={`text-4xl ${getIconStyles()} transition-all duration-500`}>
              {achievement.icon}
            </div>
          </div>
        </CircularProgressBar>

        <div className="text-center space-y-1">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-primary transition-colors">
            {achievement.title}
          </h3>
          <div className="flex gap-1.5 justify-center mt-1">
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 font-medium ${isUnlocked ? 'border-primary/30 text-primary' : 'text-slate-400 opacity-60'}`}
            >
              {achievement.category}
            </Badge>
            {isUnlocked && (
              <Badge
                className={`text-[9px] px-1.5 py-0 capitalize border-0 font-bold ${achievement.rarity === 'legendary' ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' :
                  achievement.rarity === 'epic' ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/20' :
                    achievement.rarity === 'rare' ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20' :
                      'bg-slate-500 text-white'
                  }`}
              >
                {achievement.rarity}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Unlocked checkmark */}
      {isUnlocked && (
        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300">
          <CheckCircle2 className="w-3 h-3" />
        </div>
      )}
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

  const totalProgress = achievements.reduce((acc, a) => acc + (a.progress / a.maxProgress), 0)
  const overallPercentage = achievements.length > 0 ? Math.round((totalProgress / achievements.length) * 100) : 0

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-1 md:p-1.5 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 animate-gradient-xy opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

        <div className="relative bg-black/20 backdrop-blur-sm rounded-[2.3rem] p-8 text-white overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold mb-4 tracking-wider uppercase">
                <Trophy className="w-3 h-3 text-amber-400" />
                Hall of Fame
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2 italic">
                Achievements
              </h1>
              <p className="text-white/70 text-lg max-w-md">
                Turn your financial habits into legendary milestones.
              </p>
            </div>

            {/* Overall Progress with Premium Look */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <CircularProgressBar
                progress={overallPercentage}
                maxProgress={100}
                size={140}
                strokeWidth={10}
                isUnlocked={false}
              >
                <div className="text-center group-hover:scale-110 transition-transform">
                  <div className="text-4xl font-black italic">{overallPercentage}%</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-white/60">Legacy</div>
                </div>
              </CircularProgressBar>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Unlocked", val: unlockedAchievements.length, icon: CheckCircle2, color: "emerald", desc: "Lifetime rewards" },
          { label: "Remaining", val: lockedAchievements.length, icon: Target, color: "blue", desc: "New challenges" },
          { label: "Mastery", val: categories.length, icon: Medal, color: "purple", desc: "Active domains" },
          { label: "Elite Tier", val: unlockedAchievements.filter(a => a.rarity === 'legendary' || a.rarity === 'epic').length, icon: Crown, color: "amber", desc: "Rare accomplishments" }
        ].map((stat, i) => (
          <Card key={i} className="relative group overflow-hidden border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl hover:shadow-xl transition-all duration-500 rounded-3xl">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700`}></div>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black tracking-tighter">{stat.val}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">{stat.label}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Filter - Premium Tabs */}
      <div className="flex flex-wrap gap-2 justify-center py-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-full px-4 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
        <button
          onClick={() => setFilter("all")}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${filter === "all"
            ? "bg-slate-900 text-white shadow-lg scale-105"
            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          Overview
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${filter === category
              ? "bg-primary text-primary-foreground shadow-lg scale-105"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Achievements Grid with Staggered layout */}
      <div className="space-y-12">
        {/* Unlocked Section */}
        {filteredUnlocked.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black tracking-tight uppercase italic">
                  Mastered
                </h2>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1 rounded-lg">
                {filteredUnlocked.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredUnlocked.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Separator Line */}
        {filteredUnlocked.length > 0 && filteredLocked.length > 0 && (
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-800 to-transparent"></div>
        )}

        {/* Locked Section */}
        {filteredLocked.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-black tracking-tight uppercase italic opa">
                  Next Milestones
                </h2>
              </div>
              <Badge variant="outline" className="font-bold px-4 py-1 rounded-lg border-blue-500/30 text-blue-600 dark:text-blue-400">
                {filteredLocked.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredLocked.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievement Detail Dialog - Enhanced */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-0 p-0 overflow-hidden bg-white dark:bg-slate-950">
          <DialogTitle className="sr-only">Achievement Details</DialogTitle>
          {selectedAchievement ? (
            <div className="relative">
              {/* Header Gradient */}
              <div className={`h-48 w-full bg-gradient-to-br ${selectedAchievement.rarity === 'legendary' ? 'from-amber-600 to-orange-600' :
                selectedAchievement.rarity === 'epic' ? 'from-purple-600 to-violet-600' :
                  selectedAchievement.rarity === 'rare' ? 'from-blue-600 to-cyan-600' :
                    'from-slate-600 to-slate-800'
                } opacity-20 absolute top-0 left-0`}></div>

              <div className="flex flex-col items-center space-y-6 p-8 relative z-10">
                <div className="mt-4 hover:scale-105 transition-transform duration-500">
                  <CircularProgressBar
                    progress={selectedAchievement.progress}
                    maxProgress={selectedAchievement.maxProgress}
                    size={200}
                    strokeWidth={14}
                    isUnlocked={selectedAchievement.unlocked}
                    rarity={selectedAchievement.rarity}
                  >
                    <div className={`
                      w-32 h-32 rounded-full flex items-center justify-center
                      ${selectedAchievement.unlocked ? 'bg-white dark:bg-slate-900 shadow-xl' : 'bg-slate-100/80 dark:bg-slate-800/80'}
                    `}>
                      <div className={`text-7xl ${selectedAchievement.unlocked ? 'grayscale-0' : 'grayscale opacity-50'
                        }`}>
                        {selectedAchievement.icon}
                      </div>
                    </div>
                  </CircularProgressBar>
                </div>

                <div className="text-center space-y-4 w-full">
                  <div className="space-y-1">
                    <Badge variant="secondary" className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800">
                      {selectedAchievement.category}
                    </Badge>
                    <h3 className="text-3xl font-black tracking-tight">{selectedAchievement.title}</h3>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {selectedAchievement.description}
                  </p>

                  {/* Progress Tracking */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-end mb-3">
                      <div className="text-left">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Status</div>
                        <div className="text-xl font-black">
                          {selectedAchievement.progress.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {selectedAchievement.maxProgress.toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge className={`font-bold ${selectedAchievement.unlocked ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                        {selectedAchievement.unlocked ? 'UNLOCKED' : `${Math.round((selectedAchievement.progress / selectedAchievement.maxProgress) * 100)}%`}
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r transition-all duration-1000 ${selectedAchievement.rarity === 'legendary' ? 'from-amber-400 to-orange-500' :
                          selectedAchievement.rarity === 'epic' ? 'from-purple-400 to-violet-500' :
                            selectedAchievement.rarity === 'rare' ? 'from-blue-400 to-cyan-500' :
                              'from-slate-400 to-slate-600'
                          }`}
                        style={{ width: `${(selectedAchievement.progress / selectedAchievement.maxProgress) * 100}%` }}
                      >
                        <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setSelectedAchievement(null)}
                    className="w-full h-14 rounded-2xl font-bold bg-slate-900 dark:bg-white dark:text-slate-900 hover:scale-95 transition-transform"
                    size="lg"
                  >
                    Got It
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Celebration Dialog - CORRECTED and PREMIUM */}
      <Dialog open={celebration.show} onOpenChange={onDismissCelebration}>
        <DialogContent className="sm:max-w-md rounded-[3rem] border-0 p-0 overflow-hidden bg-slate-950 text-white shadow-[0_0_100px_rgba(245,158,11,0.2)]">
          <DialogTitle className="sr-only">Achievement Unlocked</DialogTitle>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-pink-900/40 animate-pulse"></div>

          {celebration.achievement && (
            <div className="flex flex-col items-center space-y-8 p-10 relative z-10 text-center">
              <div className="relative">
                {/* Orbital Glow rings */}
                <div className="absolute inset-0 bg-amber-500/20 rounded-full scale-[1.5] blur-3xl animate-pulse"></div>
                <div className="absolute inset-0 bg-orange-500/20 rounded-full scale-[2] blur-3xl animate-pulse delay-700"></div>

                <CircularProgressBar
                  progress={celebration.achievement.maxProgress}
                  maxProgress={celebration.achievement.maxProgress}
                  size={240}
                  strokeWidth={16}
                  isUnlocked={true}
                  rarity={celebration.achievement.rarity}
                >
                  <div className="w-40 h-40 rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/10 overflow-hidden group">
                    <div className="text-8xl animate-bounce-slow transform-gpu drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                      {celebration.achievement.icon}
                    </div>
                  </div>
                </CircularProgressBar>

                <div className="absolute -top-4 -right-4 animate-spin-slow">
                  <Star className="w-12 h-12 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                </div>
                <div className="absolute -bottom-4 -left-4 animate-spin-slow-reverse">
                  <Sparkles className="w-10 h-10 text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black tracking-widest uppercase">
                  <Sparkles className="w-3 h-3" />
                  New Rank Achieved
                </div>
                <h3 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                  {celebration.achievement.title}
                </h3>
                <p className="text-white/60 text-lg font-medium leading-relaxed max-w-sm">
                  {celebration.achievement.description}
                </p>

                <div className="flex gap-4 justify-center pt-2">
                  <div className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase">Rarity</span>
                    <span className="font-black text-amber-400 uppercase tracking-tighter">{celebration.achievement.rarity}</span>
                  </div>
                  <div className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase">Category</span>
                    <span className="font-black uppercase tracking-tighter">{celebration.achievement.category}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={onDismissCelebration}
                className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-amber-500 via-orange-600 to-pink-600 hover:scale-105 transition-all duration-300 font-black text-lg shadow-[0_10px_40px_-10px_rgba(245,158,11,0.5)] border-0"
                size="lg"
              >
                Continue Your Journey
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
