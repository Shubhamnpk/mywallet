"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import type { Goal, Achievement, UserProfile, Transaction, Budget, DebtAccount } from "@/types/wallet"
import {
  Trophy,
  Star,
  Award,
  Target,
  Zap,
  Crown,
  Gem,
  Medal,
  Shield,
  Flame,
  TrendingUp,
  CheckCircle2} from "lucide-react"

interface UseAchievementsProps {
  goals: Goal[]
  transactions: Transaction[]
  budgets: Budget[]
  debtAccounts: DebtAccount[]
  userProfile: UserProfile
}

export function useAchievements({
  goals,
  transactions,
  budgets,
  debtAccounts,
  userProfile
}: UseAchievementsProps) {
  const [celebration, setCelebration] = useState<{
    show: boolean
    achievement: Achievement | null
    goal?: Goal
    pendingCount?: number
    totalCount?: number
  }>({ show: false, achievement: null })

  const celebratedAchievements = useRef<Set<string>>(new Set())
  const firstUnlockedTimes = useRef<Map<string, number>>(new Map())
  const isCelebratedLoaded = useRef(false)
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCelebrationQueue = useRef<Achievement[]>([])
  const celebrationIndexRef = useRef(0)

  // Initialize celebrated achievements from userProfile
  useEffect(() => {
    const ids = userProfile.celebratedAchievements
    if (Array.isArray(ids)) {
      celebratedAchievements.current = new Set(ids)
    } else {
      celebratedAchievements.current = new Set()
    }
    isCelebratedLoaded.current = true
  }, [userProfile.celebratedAchievements])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current)
      }
    }
  }, [])

  const achievements = useMemo(() => {
    const newAchievements: Achievement[] = []

    // Goal-based achievements
    goals.forEach((goal) => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100

      const progressMilestones = [
        { threshold: 25, title: "First Steps", description: "Reached 25% of your goal", icon: <Target className="w-5 h-5" />, color: "text-blue-600 bg-blue-50" },
        { threshold: 50, title: "Halfway Hero", description: "Reached 50% of your goal", icon: <Star className="w-5 h-5" />, color: "text-amber-600 bg-amber-50" },
        { threshold: 75, title: "Almost There", description: "Reached 75% of your goal", icon: <Award className="w-5 h-5" />, color: "text-purple-600 bg-purple-50" },
        { threshold: 100, title: "Goal Crusher", description: "Completed your goal!", icon: <Trophy className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-50" }
      ]

      progressMilestones.forEach((milestone) => {
        const achievementId = `${goal.id}_${milestone.threshold}`
        const isUnlocked = progress >= milestone.threshold
        const rarity = milestone.threshold === 25 ? "common" : milestone.threshold === 50 ? "rare" : milestone.threshold === 75 ? "epic" : "legendary"

        // Preserve first unlock time
        if (isUnlocked && !firstUnlockedTimes.current.has(achievementId)) {
          firstUnlockedTimes.current.set(achievementId, Date.now())
        }

        newAchievements.push({
          id: achievementId,
          title: milestone.title,
          description: `${milestone.description} - ${goal.title || goal.name}`,
          icon: milestone.icon,
          color: milestone.color,
          unlocked: isUnlocked,
          unlockedAt: isUnlocked
            ? new Date(firstUnlockedTimes.current.get(achievementId) || Date.now())
            : undefined,
          goalId: goal.id,
          progress: Math.min(progress, milestone.threshold),
          maxProgress: milestone.threshold,
          category: "Goal Progress",
          rarity
        })
      })
    })

    // Global goal achievements
    const totalGoals = goals.length
    const completedGoals = goals.filter(g => (g.currentAmount / g.targetAmount) * 100 >= 100).length
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0)

    const globalAchievements: Partial<Achievement>[] = [
      {
        id: "first_goal",
        title: "Goal Setter",
        description: "Created your first financial goal",
        icon: <Target className="w-5 h-5" />,
        color: "text-blue-600 bg-blue-50",
        unlocked: totalGoals >= 1,
        progress: Math.min(totalGoals, 1),
        maxProgress: 1,
        category: "Goal Setting",
        rarity: "common" as const
      },
      {
        id: "goal_collector",
        title: "Goal Collector",
        description: "Created 5 or more financial goals",
        icon: <Star className="w-5 h-5" />,
        color: "text-amber-600 bg-amber-50",
        unlocked: totalGoals >= 5,
        progress: Math.min(totalGoals, 5),
        maxProgress: 5,
        category: "Goal Setting",
        rarity: "rare" as const
      },
      {
        id: "first_completion",
        title: "First Victory",
        description: "Completed your first goal",
        icon: <Trophy className="w-5 h-5" />,
        color: "text-emerald-600 bg-emerald-50",
        unlocked: completedGoals >= 1,
        progress: Math.min(completedGoals, 1),
        maxProgress: 1,
        category: "Goal Setting",
        rarity: "rare" as const
      },
      {
        id: "goal_master",
        title: "Goal Master",
        description: "Completed 10 goals",
        icon: <Crown className="w-5 h-5" />,
        color: "text-purple-600 bg-purple-50",
        unlocked: completedGoals >= 10,
        progress: Math.min(completedGoals, 10),
        maxProgress: 10,
        category: "Goal Setting",
        rarity: "legendary" as const
      },
      {
        id: "saving_champion",
        title: "Saving Champion",
        description: "Saved over $10,000 across all goals",
        icon: <Medal className="w-5 h-5" />,
        color: "text-orange-600 bg-orange-50",
        unlocked: totalSaved >= 10000,
        progress: Math.min(totalSaved, 10000),
        maxProgress: 10000,
        category: "Savings",
        rarity: "rare" as const
      },
      {
        id: "consistency_king",
        title: "Consistency King",
        description: "Maintained goals for over a year",
        icon: <Flame className="w-5 h-5" />,
        color: "text-red-600 bg-red-50",
        unlocked: goals.some(g => {
          if (!g.createdAt) return false
          const createdDate = new Date(g.createdAt)
          const now = new Date()
          const diffTime = now.getTime() - createdDate.getTime()
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          return diffDays >= 365
        }),
        progress: goals.length > 0
          ? Math.min(
              Math.floor(
                (Date.now() - Math.min(...goals.filter(g => g.createdAt).map(g => new Date(g.createdAt).getTime()))) /
                (1000 * 60 * 60 * 24)
              ),
              365
            )
          : 0,
        maxProgress: 365,
        category: "Consistency",
        rarity: "epic" as const
      },
      {
        id: "goal_perfectionist",
        title: "Goal Perfectionist",
        description: "Created 25 financial goals",
        icon: <Star className="w-5 h-5" />,
        color: "text-indigo-600 bg-indigo-50",
        unlocked: totalGoals >= 25,
        progress: Math.min(totalGoals, 25),
        maxProgress: 25,
        category: "Goal Setting",
        rarity: "legendary" as const
      }
    ]

    globalAchievements.forEach((achievement) => {
      const id = achievement.id!
      if (achievement.unlocked && !firstUnlockedTimes.current.has(id)) {
        firstUnlockedTimes.current.set(id, Date.now())
      }
      newAchievements.push({
        ...achievement,
        unlockedAt: achievement.unlocked
          ? new Date(firstUnlockedTimes.current.get(id) || Date.now())
          : undefined
      } as Achievement)
    })

    // Transaction-based achievements
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

    // Count distinct days with transactions
    const transactionDates = new Set(transactions.map(t => new Date(t.date).toDateString()))
    const transactionDayCount = transactionDates.size

    // Compute budget spending once
    const budgetSpending = budgets.map(budget => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category?.toLowerCase() === budget.category?.toLowerCase())
        .reduce((s, t) => s + t.amount, 0)
      return { budget, spent, withinLimit: spent <= budget.limit }
    })

    const transactionAchievements: Partial<Achievement>[] = [
      {
        id: "first_income",
        title: "Income Earner",
        description: "Recorded your first income transaction",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "text-green-600 bg-green-50",
        unlocked: totalIncome > 0,
        progress: Math.min(totalIncome, 1),
        maxProgress: 1,
        category: "Economy",
        rarity: "common" as const
      },
      {
        id: "data_enthusiast",
        title: "Data Enthusiast",
        description: "Recorded transactions on 7 different days",
        icon: <Zap className="w-5 h-5" />,
        color: "text-yellow-600 bg-yellow-50",
        unlocked: transactionDayCount >= 7,
        progress: Math.min(transactionDayCount, 7),
        maxProgress: 7,
        category: "Activity",
        rarity: "rare" as const
      },
      {
        id: "budget_keeper",
        title: "Budget Keeper",
        description: "Stayed within budget limits for all categories",
        icon: <Shield className="w-5 h-5" />,
        color: "text-blue-600 bg-blue-50",
        unlocked: budgetSpending.length > 0 && budgetSpending.every(b => b.withinLimit),
        progress: budgetSpending.filter(b => b.withinLimit).length,
        maxProgress: Math.max(budgetSpending.length, 1),
        category: "Discipline",
        rarity: "rare" as const
      },
      {
        id: "debt_free",
        title: "Debt Free",
        description: "Eliminated all outstanding debt",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-emerald-600 bg-emerald-50",
        unlocked: debtAccounts.length > 0 && debtAccounts.every(d => d.balance === 0),
        progress: debtAccounts.length > 0 ? debtAccounts.filter(d => d.balance === 0).length : 0,
        maxProgress: Math.max(debtAccounts.length, 1),
        category: "Freedom",
        rarity: "epic" as const
      },
      {
        id: "transaction_expert",
        title: "Transaction Expert",
        description: "Recorded 100 transactions",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "text-blue-600 bg-blue-50",
        unlocked: transactions.length >= 100,
        progress: Math.min(transactions.length, 100),
        maxProgress: 100,
        category: "Activity",
        rarity: "rare" as const
      },
      {
        id: "transaction_master",
        title: "Transaction Master",
        description: "Recorded 1000 transactions",
        icon: <Crown className="w-5 h-5" />,
        color: "text-purple-600 bg-purple-50",
        unlocked: transactions.length >= 1000,
        progress: Math.min(transactions.length, 1000),
        maxProgress: 1000,
        category: "Activity",
        rarity: "legendary" as const
      },
      {
        id: "wealth_builder",
        title: "Wealth Builder",
        description: "Saved over $50,000 across all goals",
        icon: <Medal className="w-5 h-5" />,
        color: "text-orange-600 bg-orange-50",
        unlocked: totalSaved >= 50000,
        progress: Math.min(totalSaved, 50000),
        maxProgress: 50000,
        category: "Savings",
        rarity: "legendary" as const
      },
      {
        id: "income_mogul",
        title: "Income Mogul",
        description: "Earned over $100,000 in total income",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "text-emerald-600 bg-emerald-50",
        unlocked: totalIncome >= 100000,
        progress: Math.min(totalIncome, 100000),
        maxProgress: 100000,
        category: "Economy",
        rarity: "epic" as const
      },
      {
        id: "six_figure_club",
        title: "Six-Figure Club",
        description: "Reach a net income surplus of $100,000",
        icon: <Gem className="w-5 h-5" />,
        color: "text-amber-600 bg-amber-50",
        unlocked: (totalIncome - totalExpenses) >= 100000,
        progress: Math.min(Math.max(totalIncome - totalExpenses, 0), 100000),
        maxProgress: 100000,
        category: "Wealth",
        rarity: "legendary" as const
      },
      {
        id: "emergency_ready",
        title: "Emergency Ready",
        description: "Saved 3 months of expenses ($15,000 estimate)",
        icon: <Shield className="w-5 h-5" />,
        color: "text-sky-600 bg-sky-50",
        unlocked: totalSaved >= 15000,
        progress: Math.min(totalSaved, 15000),
        maxProgress: 15000,
        category: "Discipline",
        rarity: "epic" as const
      }
    ]

    transactionAchievements.forEach((achievement) => {
      const id = achievement.id!
      if (achievement.unlocked && !firstUnlockedTimes.current.has(id)) {
        firstUnlockedTimes.current.set(id, Date.now())
      }
      newAchievements.push({
        ...achievement,
        unlockedAt: achievement.unlocked
          ? new Date(firstUnlockedTimes.current.get(id) || Date.now())
          : undefined
      } as Achievement)
    })

    return newAchievements
  }, [goals, transactions, budgets, debtAccounts])

  // Trigger celebrations for newly unlocked achievements
  useEffect(() => {
    if (!isCelebratedLoaded.current) return

    if (!celebration.show) {
      const unlockedAchievements = achievements.filter(a => a.unlocked && !celebratedAchievements.current.has(a.id))

      if (unlockedAchievements.length > 0) {
        pendingCelebrationQueue.current = unlockedAchievements
        celebrationIndexRef.current = 0
        const achievement = unlockedAchievements[0]

        celebrationTimerRef.current = setTimeout(() => {
          setCelebration({
            show: true,
            achievement,
            goal: achievement.goalId ? goals.find(g => g.id === achievement.goalId) : undefined,
            pendingCount: unlockedAchievements.length - 1,
            totalCount: unlockedAchievements.length
          })
        }, 1000)
      }
    }
  }, [achievements, celebration.show, goals])

  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const lockedAchievements = achievements.filter(a => !a.unlocked)

  const getCelebratedAchievements = useCallback(() => {
    return Array.from(celebratedAchievements.current)
  }, [])

  const dismissCelebration = useCallback(() => {
    setCelebration(prev => {
      if (prev.achievement) {
        celebratedAchievements.current.add(prev.achievement.id)
      }

      const queue = pendingCelebrationQueue.current
      const nextIndex = celebrationIndexRef.current + 1

      if (nextIndex < queue.length) {
        celebrationIndexRef.current = nextIndex
        const nextAchievement = queue[nextIndex]
        return {
          show: true,
          achievement: nextAchievement,
          goal: nextAchievement.goalId ? goals.find(g => g.id === nextAchievement.goalId) : undefined,
          pendingCount: queue.length - nextIndex - 1,
          totalCount: queue.length
        }
      }

      return { show: false, achievement: null }
    })
  }, [goals])

  const skipAllCelebrations = useCallback(() => {
    pendingCelebrationQueue.current.forEach(a => celebratedAchievements.current.add(a.id))
    pendingCelebrationQueue.current = []
    celebrationIndexRef.current = 0
    setCelebration({ show: false, achievement: null })
  }, [])

  const markAsCelebrated = useCallback((achievementIds: string[]) => {
    achievementIds.forEach(id => celebratedAchievements.current.add(id))
  }, [])

  return {
    achievements,
    unlockedAchievements,
    lockedAchievements,
    celebration,
    dismissCelebration,
    skipAllCelebrations,
    getCelebratedAchievements,
    markAsCelebrated
  }
}
