"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { Goal, Achievement, UserProfile, Transaction, Budget, DebtAccount } from "@/types/wallet"
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
  CheckCircle2,
  Flame,
  TrendingUp,
  Shield,
  AlertTriangle
} from "lucide-react"

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
  }>({ show: false, achievement: null })

  const celebratedAchievements = useRef<Set<string>>(new Set())

  const achievements = useMemo(() => {
    const newAchievements: Achievement[] = []

    // Goal-based achievements
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
        const isUnlocked = progress >= milestone.threshold
        const rarity = milestone.threshold === 25 ? "common" : milestone.threshold === 50 ? "rare" : milestone.threshold === 75 ? "epic" : "legendary"

        newAchievements.push({
          id: achievementId,
          title: milestone.title,
          description: `${milestone.description} - ${goal.title || goal.name}`,
          icon: milestone.icon,
          color: milestone.color,
          unlocked: isUnlocked,
          unlockedAt: isUnlocked ? new Date() : undefined,
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
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)

    const globalAchievements = [
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
        rarity: "epic" as const
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
        maxProgress: 1,
        category: "Consistency",
        rarity: "epic" as const
      }
    ]

    globalAchievements.forEach((achievement) => {
      newAchievements.push({
        ...achievement,
        unlockedAt: achievement.unlocked ? new Date() : undefined
      })
    })

    // Transaction-based achievements
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    const netIncome = totalIncome - totalExpenses

    const transactionAchievements = [
      {
        id: "first_income",
        title: "Income Earner",
        description: "Recorded your first income transaction",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "text-green-600 bg-green-50",
        unlocked: totalIncome > 0,
        progress: Math.min(totalIncome, 1),
        maxProgress: 1,
        category: "Transactions",
        rarity: "common" as const
      },
      {
        id: "budget_keeper",
        title: "Budget Keeper",
        description: "Stayed within budget limits for all categories",
        icon: <Shield className="w-5 h-5" />,
        color: "text-blue-600 bg-blue-50",
        unlocked: budgets.length > 0 && budgets.every(budget => {
          const spent = transactions
            .filter(t => t.type === 'expense' && t.category === budget.category)
            .reduce((s, t) => s + t.amount, 0)
          return spent <= budget.limit
        }),
        progress: budgets.filter(budget => {
          const spent = transactions
            .filter(t => t.type === 'expense' && t.category === budget.category)
            .reduce((s, t) => s + t.amount, 0)
          return spent <= budget.limit
        }).length,
        maxProgress: budgets.length || 1,
        category: "Budgeting",
        rarity: "rare" as const
      },
      {
        id: "debt_free",
        title: "Debt Free",
        description: "Eliminated all outstanding debt",
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "text-emerald-600 bg-emerald-50",
        unlocked: debtAccounts.length > 0 && debtAccounts.every(d => d.balance === 0),
        progress: debtAccounts.filter(d => d.balance === 0).length,
        maxProgress: debtAccounts.length || 1,
        category: "Debt Management",
        rarity: "epic" as const
      },
      {
        id: "transaction_novice",
        title: "Transaction Novice",
        description: "Recorded 10 transactions",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "text-green-600 bg-green-50",
        unlocked: transactions.length >= 10,
        progress: Math.min(transactions.length, 10),
        maxProgress: 10,
        category: "Transactions",
        rarity: "common" as const
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
        category: "Transactions",
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
        category: "Transactions",
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
        category: "Income",
        rarity: "epic" as const
      }
    ]

    transactionAchievements.forEach((achievement) => {
      newAchievements.push({
        ...achievement,
        unlockedAt: achievement.unlocked ? new Date() : undefined
      })
    })

    return newAchievements
  }, [goals, transactions, budgets, debtAccounts])

  // Trigger celebrations for newly unlocked achievements
  useEffect(() => {
    const unlockedAchievements = achievements.filter(a => a.unlocked && !celebratedAchievements.current.has(a.id))
    if (unlockedAchievements.length > 0 && !celebration.show) {
      const achievement = unlockedAchievements[0] // Celebrate the first new achievement
      setTimeout(() => {
        setCelebration({
          show: true,
          achievement,
          goal: achievement.goalId ? goals.find(g => g.id === achievement.goalId) : undefined
        })
        celebratedAchievements.current.add(achievement.id)
      }, 1000)
    }
  }, [achievements, celebration.show, goals])

  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const lockedAchievements = achievements.filter(a => !a.unlocked)

  const dismissCelebration = () => {
    setCelebration({ show: false, achievement: null })
  }

  return {
    achievements,
    unlockedAchievements,
    lockedAchievements,
    celebration,
    dismissCelebration
  }
}