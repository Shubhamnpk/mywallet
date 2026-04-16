"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Target,
  Plus,
  Calendar,
  Send,
  ArrowRight,
  Search,
  Filter,
  ChevronDown,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  MoreHorizontal,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  Heart,
  Plane,
  ShoppingBag,
  Briefcase,
  Zap,
  Trophy,
  Star,
  Clock,
  Sparkles,
  Receipt,
} from "lucide-react"
import { GoalDialog } from "./goal-dialog"
import { useWalletData } from "@/contexts/wallet-data-context"
import type { Goal, Transaction, UserProfile } from "@/types/wallet"
import { cn, formatCurrency } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import { getGoalChallengeSummary, getGoalEffectiveProgress, getGoalEffectiveRemainingAmount, getGoalEffectiveTargetAmount } from "@/lib/goal-challenge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoalProgressVisualization } from "./goal-progress-visualization"
import { ScenarioPlanningCalculator } from "./scenario-planning-calculator"

interface EnhancedGoalsListProps {
  goals: Goal[]
  userProfile: UserProfile
}

type FilterType = "all" | "active" | "completed" | "overdue"
type SortType = "progress" | "target-date" | "amount" | "name"

export function EnhancedGoalsList({ goals, userProfile }: EnhancedGoalsListProps) {
  const { transferToGoal, balance, updateGoal, deleteGoal, useGoalForInvestment, transactions } = useWalletData()

  // Get currency symbol
  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency)
  }, [userProfile?.currency, (userProfile as any)?.customCurrency])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; goalId: string; goalName: string }>({
    open: false,
    goalId: "",
    goalName: "",
  })
  const [transferAmount, setTransferAmount] = useState("")
  const [investmentDialog, setInvestmentDialog] = useState<{ open: boolean; goalId: string; goalName: string }>({
    open: false,
    goalId: "",
    goalName: "",
  })
  const [investmentAmount, setInvestmentAmount] = useState("")
  const [investmentMarket, setInvestmentMarket] = useState<"nepal" | "uk" | "split">("split")
  const [investmentNotes, setInvestmentNotes] = useState("")
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; goalId: string; goalName: string }>({
    open: false,
    goalId: "",
    goalName: "",
  })
  const [historyRange, setHistoryRange] = useState<"active-month" | "this-week" | "all">("active-month")

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortType, setSortType] = useState<SortType>("progress")
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  const filteredAndSortedGoals = useMemo(() => {

    const filtered = goals.filter((goal) => {
      const matchesSearch =
        goal.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        (goal.category?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false)

      const progress = getGoalEffectiveProgress(goal)
      const isCompleted = progress >= 100
      const isOverdue = new Date(goal.targetDate) < new Date() && !isCompleted


      switch (filterType) {
        case "active":
          return !isCompleted && !isOverdue && matchesSearch
        case "completed":
          return isCompleted && matchesSearch
        case "overdue":
          return isOverdue && matchesSearch
        default:
          return matchesSearch
      }
    })


    const sorted = filtered.sort((a, b) => {
      switch (sortType) {
        case "progress":
          const progressA = getGoalEffectiveProgress(a)
          const progressB = getGoalEffectiveProgress(b)
          return progressB - progressA
        case "target-date":
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        case "amount":
          return b.targetAmount - a.targetAmount
        case "name":
          const aName = a.title || a.name || ""
          const bName = b.title || b.name || ""
          return aName.localeCompare(bName)
        default:
          return 0
      }
    })
    return sorted
  }, [goals, searchQuery, filterType, sortType])

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setIsDialogOpen(true)
  }

  const handleDeleteGoal = (goalId: string) => {
    if (confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      deleteGoal(goalId)
      const newSelected = new Set(selectedGoals)
      newSelected.delete(goalId)
      setSelectedGoals(newSelected)
    }
  }

  const handleBulkDelete = () => {
    if (selectedGoals.size === 0) return

    const count = selectedGoals.size
    if (
      confirm(`Are you sure you want to delete ${count} goal${count > 1 ? "s" : ""}? This action cannot be undone.`)
    ) {
      selectedGoals.forEach((goalId) => deleteGoal(goalId))
      setSelectedGoals(new Set())
    }
  }

  const handleSelectGoal = (goalId: string, checked: boolean) => {
    const newSelected = new Set(selectedGoals)
    if (checked) {
      newSelected.add(goalId)
    } else {
      newSelected.delete(goalId)
    }
    setSelectedGoals(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGoals(new Set(filteredAndSortedGoals.map((goal) => goal.id)))
    } else {
      setSelectedGoals(new Set())
    }
  }

  const formatTimeEquivalent = (amount: number) => {
    const { getTimeEquivalentBreakdown } = require("@/lib/wallet-utils")
    const breakdown = getTimeEquivalentBreakdown(amount, userProfile)
    return breakdown ? breakdown.formatted.userFriendly : "0m"
  }

  const handleTransfer = async () => {
    const amount = Number.parseFloat(transferAmount)
    if (amount <= 0 || amount > balance) return

    try {
      const result = await transferToGoal(transferDialog.goalId, amount)
      if (result && result.success) {
        setTransferDialog({ open: false, goalId: "", goalName: "" })
        setTransferAmount("")
      } else {
        alert(result?.error || "Transfer failed")
      }
    } catch (error) {
      alert("Transfer failed: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const handleInvestmentUse = async () => {
    const amount = Number.parseFloat(investmentAmount)
    if (amount <= 0) return

    try {
      const result = await useGoalForInvestment(investmentDialog.goalId, amount, {
        market: investmentMarket,
        notes: investmentNotes.trim() || undefined,
      })
      if (result?.success) {
        setInvestmentDialog({ open: false, goalId: "", goalName: "" })
        setInvestmentAmount("")
        setInvestmentMarket("split")
        setInvestmentNotes("")
      } else {
        alert(result?.error || "Investment action failed")
      }
    } catch (error) {
      alert("Investment action failed: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedGoals(newExpanded)
  }

  const getGoalStatus = (goal: Goal) => {
    const progress = getGoalEffectiveProgress(goal)
    const isCompleted = progress >= 100
    const isOverdue = new Date(goal.targetDate) < new Date() && !isCompleted

    if (isCompleted) return { status: "completed", color: "bg-primary", icon: CheckCircle2 }
    if (isOverdue) return { status: "overdue", color: "bg-red-600", icon: AlertCircle }
    if (progress > 75) return { status: "near-completion", color: "bg-amber-600", icon: TrendingUp }
    return { status: "active", color: "bg-blue-600", icon: Target }
  }

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "emergency": return AlertTriangle
      case "savings": return PiggyBank
      case "house": return Home
      case "car": return Car
      case "education": return GraduationCap
      case "health": return Heart
      case "travel": return Plane
      case "shopping": return ShoppingBag
      case "business": return Briefcase
      default: return Target
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 border-red-200"
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200"
      case "low": return "text-blue-600 bg-blue-50 border-blue-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-emerald-500"
    if (progress >= 75) return "bg-blue-500"
    if (progress >= 50) return "bg-amber-500"
    if (progress >= 25) return "bg-orange-500"
    return "bg-red-500"
  }

  const getGoalHistory = (goalId: string) =>
    transactions
      .filter((transaction) => transaction.allocationType === "goal" && transaction.allocationTarget === goalId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filterTransactionsByRange = (items: Transaction[], range: "active-month" | "this-week" | "all") => {
    if (range === "all") return items

    const now = new Date()
    const start = new Date(now)

    if (range === "active-month") {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    } else {
      const day = start.getDay()
      const diff = day === 0 ? 6 : day - 1
      start.setDate(start.getDate() - diff)
      start.setHours(0, 0, 0, 0)
    }

    return items.filter((transaction) => new Date(transaction.date).getTime() >= start.getTime())
  }

  const getGoalHistoryMeta = (transaction: Transaction) => {
    const normalizedDescription = (transaction.description || "").toLowerCase()
    const normalizedCategory = (transaction.category || "").toLowerCase()

    if (normalizedCategory === "goal investment" || normalizedDescription.includes("goal investment")) {
      return {
        badgeClassName: "border-blue-200 bg-blue-50 text-blue-700",
        label: "Investment Use",
        signedAmount: `-${formatCurrency(transaction.amount, userProfile.currency, userProfile.customCurrency)}`,
        signedAmountClassName: "text-blue-600",
      }
    }

    if (transaction.actual === 0 || normalizedCategory === "goal spending" || normalizedDescription.includes("spent from goal")) {
      return {
        badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
        label: "Money Out",
        signedAmount: `-${formatCurrency(transaction.amount, userProfile.currency, userProfile.customCurrency)}`,
        signedAmountClassName: "text-amber-600",
      }
    }

    return {
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Contribution",
      signedAmount: `+${formatCurrency(transaction.amount, userProfile.currency, userProfile.customCurrency)}`,
      signedAmountClassName: "text-emerald-600",
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Financial Goals ({filteredAndSortedGoals.length})
            </h3>
            <div className="flex items-center gap-2">
              {selectedGoals.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedGoals.size})
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditingGoal(null)
                  setIsDialogOpen(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Goal
              </Button>
            </div>
          </div>

          {goals.length > 0 && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search goals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                    <SelectTrigger className="w-32">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Goals</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortType} onValueChange={(value: SortType) => setSortType(value)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="progress">By Progress</SelectItem>
                      <SelectItem value="target-date">By Date</SelectItem>
                      <SelectItem value="amount">By Amount</SelectItem>
                      <SelectItem value="name">By Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredAndSortedGoals.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <Checkbox checked={selectedGoals.size === filteredAndSortedGoals.length} onCheckedChange={handleSelectAll} />
                  <span className="text-sm text-muted-foreground">
                    {selectedGoals.size === 0
                      ? "Select all goals"
                      : `${selectedGoals.size} of ${filteredAndSortedGoals.length} goals selected`}
                  </span>
                </div>
              )}
            </>
          )}

          {filteredAndSortedGoals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{goals.length === 0 ? "No Goals Yet" : "No Goals Found"}</h3>
                <p className="text-muted-foreground mb-4">
                  {goals.length === 0
                    ? "Set financial goals to track your progress and stay motivated!"
                    : "Try adjusting your search or filter criteria."}
                </p>
                {goals.length === 0 && <Button onClick={() => setIsDialogOpen(true)}>Create Your First Goal</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {filteredAndSortedGoals.map((goal) => {
                const challengeSummary = getGoalChallengeSummary(goal)
                const effectiveTargetAmount = getGoalEffectiveTargetAmount(goal)
                const progress = getGoalEffectiveProgress(goal)
                const remaining = getGoalEffectiveRemainingAmount(goal)
                const isCompleted = progress >= 100
                const isExpanded = expandedGoals.has(goal.id)
                const goalStatus = getGoalStatus(goal)
                const StatusIcon = goalStatus.icon
                const CategoryIcon = getCategoryIcon(goal.category)
                const isSelected = selectedGoals.has(goal.id)
                const activeDeadline = challengeSummary?.currentDeadline || new Date(goal.targetDate)
                const daysRemaining = Math.max(0, Math.ceil((new Date(activeDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))

                return (
                  <Card
                    key={goal.id}
                    className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${isCompleted
                      ? "border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-blue-50/50 dark:from-emerald-950/20 dark:to-blue-950/20"
                      : isSelected
                        ? "ring-2 ring-blue-500 shadow-md"
                        : "hover:border-primary/30"
                      }`}
                  >
                    {/* Priority indicator stripe */}
                    {goal.priority && (
                      <div className={`absolute top-0 left-0 w-1 h-full ${getPriorityColor(goal.priority).split(' ')[0].replace('text-', 'bg-')}`} />
                    )}

                    <Collapsible open={isExpanded} onOpenChange={() => toggleGoalExpansion(goal.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-2 md:pb-4 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-0">
                            <div className="flex items-start gap-2 md:gap-4 flex-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectGoal(goal.id, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1"
                              />

                              <div className="flex items-center gap-2 md:gap-3 flex-1">
                                <div className={`p-1 md:p-2 rounded-lg ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-muted'}`}>
                                  <CategoryIcon className="w-4 h-4 md:w-5 md:h-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CardTitle className="text-base md:text-lg truncate">
                                      {goal.title || goal.name}
                                    </CardTitle>
                                    {goal.priority && (
                                      <Badge variant="outline" className={`text-xs ${getPriorityColor(goal.priority)}`}>
                                        {goal.priority.toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <StatusIcon className="w-3 h-3 md:w-4 md:h-4" />
                                      <span className="font-medium">{progress.toFixed(1)}% complete</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                      <span>{daysRemaining} days left</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3">
                              <div className="text-left md:text-right flex-1 md:flex-none">
                                <p className="text-xs text-muted-foreground">Target</p>
                                <p className="font-bold text-base md:text-lg">
                                  {formatCurrency(effectiveTargetAmount, userProfile.currency, userProfile.customCurrency)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(goal.currentAmount, userProfile.currency, userProfile.customCurrency)} saved
                                </p>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleEditGoal(goal)} className="cursor-pointer">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Goal
                                  </DropdownMenuItem>
                                  {!isCompleted && (
                                    <DropdownMenuItem
                                      onClick={() => setTransferDialog({ open: true, goalId: goal.id, goalName: goal.title || goal.name || "" })}
                                      className="cursor-pointer"
                                    >
                                      <Send className="w-4 h-4 mr-2" />
                                      Add Money
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Goal
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>

                          {/* Enhanced Progress Bar */}
                          <div className="mt-2 md:mt-4 ml-8 md:ml-12">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getProgressColor(progress)}`} />
                                <span className="text-xs md:text-sm font-medium">
                                  {isCompleted ? "Goal Achieved! 🎉" : `${formatCurrency(remaining, userProfile.currency, userProfile.customCurrency)} remaining`}
                                </span>
                              </div>
                              <span className="text-xs md:text-sm text-muted-foreground">
                                {progress.toFixed(1)}%
                              </span>
                            </div>
                            <div className="relative">
                              <Progress value={Math.min(progress, 100)} className="h-2" />
                              {progress > 100 && (
                                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 rounded-full opacity-75" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="space-y-4 md:space-y-6">
                          {/* Goal Overview */}
                          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
                            <div className="text-center p-2 md:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
                              <div className="flex items-center justify-center mb-1 md:mb-2">
                                <div className="p-1 md:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                  <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                </div>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Current Progress</p>
                              <p className="text-lg md:text-xl font-bold text-blue-600">{progress.toFixed(1)}%</p>
                            </div>

                            <div className="text-center p-2 md:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border">
                              <div className="flex items-center justify-center mb-1 md:mb-2">
                                <div className="p-1 md:p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                                </div>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Amount Saved</p>
                              <p className="text-lg md:text-xl font-bold text-green-600">
                                {formatCurrency(goal.currentAmount, userProfile.currency, userProfile.customCurrency)}
                              </p>
                            </div>


                          </div>

                          {challengeSummary && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                              <div className="rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs text-muted-foreground">Challenge mode</p>
                                <p className="mt-1 text-sm font-semibold capitalize">{challengeSummary.plan.mode}</p>
                              </div>
                              <div className="rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs text-muted-foreground">Penalty status</p>
                                <p className="mt-1 text-sm font-semibold">
                                  {challengeSummary.penaltiesApplied > 0
                                    ? `${challengeSummary.penaltiesApplied} active`
                                    : "No penalty yet"}
                                </p>
                              </div>
                              <div className="rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs text-muted-foreground">Investment split</p>
                                <p className="mt-1 text-sm font-semibold">
                                  {challengeSummary.utilization.nepalPercent}% NEP / {challengeSummary.utilization.ukPercent}% UK
                                </p>
                              </div>
                            </div>
                          )}

                          {challengeSummary && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3">
                                <p className="text-xs text-muted-foreground">Challenge points</p>
                                <p className="mt-1 text-lg font-bold text-blue-600">{challengeSummary.points.total}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Hard mode investment rewards are saved here.
                                </p>
                              </div>
                              <div className="rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs text-muted-foreground">Penalty total added</p>
                                <p className="mt-1 text-lg font-bold">
                                  {formatCurrency(challengeSummary.penaltyTotal, userProfile.currency, userProfile.customCurrency)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Based on missed deadlines and one-month grace cycles.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Goal Insights */}
                          {!isCompleted && (
                            <div className="p-2 md:p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                              <div className="flex items-center gap-2 mb-2 md:mb-3">
                                <Zap className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                                <h4 className="font-semibold text-sm md:text-base text-amber-700 dark:text-amber-300">Goal Insights</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
                                <div>
                                  <p className="text-amber-700 dark:text-amber-300 mb-1">💰 Amount Still Needed</p>
                                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                                    {formatCurrency(remaining, userProfile.currency, userProfile.customCurrency)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-amber-700 dark:text-amber-300 mb-1">⏰ Time Equivalent</p>
                                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                                    {formatTimeEquivalent(remaining)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-amber-700 dark:text-amber-300 mb-1">Target Date</p>
                                  <p className="text-amber-700 dark:text-amber-300 mb-1">
                                    {new Date(activeDeadline).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-amber-700 dark:text-amber-300 mb-1">📅 Days Remaining</p>
                                  <p className="font-semibold text-amber-800 dark:text-amber-200">{daysRemaining} days</p>
                                </div>
                              </div>
                              <div className="mt-2 md:mt-3 p-1 md:p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs md:text-sm">
                                <p className="text-amber-800 dark:text-amber-200">
                                  💡 <strong>Tip:</strong> Save {formatCurrency(remaining / Math.max(daysRemaining, 1), userProfile.currency, userProfile.customCurrency)} per day to reach your goal on time!
                                </p>
                              </div>
                              {challengeSummary && (
                                <div className="mt-2 md:mt-3 rounded bg-background/70 p-2 text-xs md:text-sm text-amber-900 dark:text-amber-100">
                                  <p>
                                    Penalty adds {formatCurrency(challengeSummary.plan.penaltyAmount, userProfile.currency, userProfile.customCurrency)}
                                    {" "}after each missed deadline, with {challengeSummary.plan.graceMonths} month grace.
                                  </p>
                                  <p className="mt-1">
                                    {challengeSummary.utilization.countsInvestmentAsExpense
                                      ? `Hard mode: investment usage reduces saved progress and earns ${challengeSummary.utilization.hardModeRewardPoints} points per use.`
                                      : "Easy mode: investment usage does not reduce saved progress."}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Goal Description */}
                          {goal.description && (
                            <div className="p-2 md:p-4 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2 mb-1 md:mb-2">
                                <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                                <h4 className="font-medium text-sm md:text-base text-muted-foreground">Goal Description</h4>
                              </div>
                              <p className="text-xs md:text-sm leading-relaxed">{goal.description}</p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {!isCompleted && (
                            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                                <Button
                                  onClick={() => setTransferDialog({ open: true, goalId: goal.id, goalName: goal.title || goal.name || "" })}
                                  className="flex items-center gap-2 flex-1 text-sm md:text-base"
                                  disabled={balance <= 0}
                              >
                                <Send className="w-3 h-3 md:w-4 md:h-4" />
                                Add Money to Goal
                                <Badge variant="secondary" className="ml-auto text-xs md:text-sm">
                                  {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)} available
                                </Badge>
                              </Button>

                              {challengeSummary && (
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setInvestmentDialog({ open: true, goalId: goal.id, goalName: goal.title || goal.name || "" })
                                    setInvestmentAmount("")
                                    setInvestmentMarket("split")
                                    setInvestmentNotes("")
                                  }}
                                  className="flex items-center gap-2 text-sm md:text-base"
                                >
                                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                                  Use for Investment
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                onClick={() => handleEditGoal(goal)}
                                className="flex items-center gap-2 text-sm md:text-base"
                              >
                                <Edit className="w-3 h-3 md:w-4 md:h-4" />
                                Edit Goal
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => {
                                  setHistoryRange("active-month")
                                  setHistoryDialog({
                                    open: true,
                                    goalId: goal.id,
                                    goalName: goal.title || goal.name || "Goal",
                                  })
                                }}
                                className="flex items-center gap-2 text-sm md:text-base"
                              >
                                <Receipt className="w-3 h-3 md:w-4 md:h-4" />
                                View History
                              </Button>
                            </div>
                          )}

                          {challengeSummary && challengeSummary.penaltyHistory.length > 0 && (
                            <div className="p-2 md:p-4 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <h4 className="font-medium text-sm md:text-base text-muted-foreground">Penalty History</h4>
                              </div>
                              <div className="space-y-2">
                                {challengeSummary.penaltyHistory.slice().reverse().map((snapshot) => (
                                  <div key={snapshot.id} className="rounded-md border bg-background/80 p-2 text-xs md:text-sm">
                                    <p className="font-medium">
                                      Cycle {snapshot.cycleNumber}: +{formatCurrency(snapshot.penaltyAmount, userProfile.currency, userProfile.customCurrency)}
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                      Missed {new Date(snapshot.previousDeadline).toLocaleDateString()} and extended to {new Date(snapshot.newDeadline).toLocaleDateString()}.
                                    </p>
                                    <p className="text-muted-foreground">
                                      Target became {formatCurrency(snapshot.effectiveTargetAmount, userProfile.currency, userProfile.customCurrency)}.
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {challengeSummary && challengeSummary.points.history.length > 0 && (
                            <div className="p-2 md:p-4 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-muted-foreground" />
                                <h4 className="font-medium text-sm md:text-base text-muted-foreground">Challenge Points History</h4>
                              </div>
                              <div className="space-y-2">
                                {challengeSummary.points.history.slice().reverse().map((entry) => (
                                  <div key={entry.id} className="rounded-md border bg-background/80 p-2 text-xs md:text-sm">
                                    <p className="font-medium">+{entry.points} points</p>
                                    <p className="mt-1 text-muted-foreground">
                                      {new Date(entry.awardedAt).toLocaleDateString()} {entry.description ? `• ${entry.description}` : ""}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Goal Metadata */}
                          <div className="flex flex-wrap items-center gap-1 md:gap-2 pt-2 border-t">
                            {goal.category && (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs md:text-sm">
                                <CategoryIcon className="w-3 h-3" />
                                {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                              </Badge>
                            )}
                            {goal.priority && (
                              <Badge className={`${getPriorityColor(goal.priority)} text-xs md:text-sm`}>
                                {goal.priority.toUpperCase()} Priority
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs md:text-sm">
                              Created {new Date(goal.createdAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 mt-6">
          <GoalProgressVisualization goals={goals} userProfile={userProfile} />
        </TabsContent>

        <TabsContent value="planning" className="space-y-4 mt-6">
          <ScenarioPlanningCalculator
            goals={goals}
            userProfile={userProfile}
            currentBalance={balance}
            monthlyIncome={userProfile.monthlyEarning}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs outside of tabs */}
      <GoalDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingGoal(null)
        }}
        userProfile={userProfile}
        editingGoal={editingGoal}
      />

      <Dialog open={historyDialog.open} onOpenChange={(open) => setHistoryDialog((current) => ({ ...current, open }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{historyDialog.goalName} Transactions</DialogTitle>
          </DialogHeader>

          {(() => {
            const filteredHistory = filterTransactionsByRange(getGoalHistory(historyDialog.goalId), historyRange)
            const contributionTotal = filteredHistory
              .filter((transaction) => getGoalHistoryMeta(transaction).label === "Contribution")
              .reduce((sum, transaction) => sum + transaction.amount, 0)
            const outflowTotal = filteredHistory
              .filter((transaction) => getGoalHistoryMeta(transaction).label !== "Contribution")
              .reduce((sum, transaction) => sum + transaction.amount, 0)

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Transactions</p>
                      <p className="font-semibold">{filteredHistory.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Contributed</p>
                      <p className="font-semibold text-emerald-600">
                        +{formatCurrency(contributionTotal, userProfile.currency, userProfile.customCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Money out</p>
                      <p className="font-semibold text-amber-600">
                        -{formatCurrency(outflowTotal, userProfile.currency, userProfile.customCurrency)}
                      </p>
                    </div>
                  </div>

                  <Select
                    value={historyRange}
                    onValueChange={(value: "active-month" | "this-week" | "all") => setHistoryRange(value)}
                  >
                    <SelectTrigger className="w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active-month">Active Month</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No goal transactions in this range.
                  </div>
                ) : (
                  <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {filteredHistory.map((transaction) => {
                      const historyMeta = getGoalHistoryMeta(transaction)

                      return (
                        <div key={transaction.id} className="rounded-md border bg-background/80 p-3 text-xs md:text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={historyMeta.badgeClassName}>
                                  {historyMeta.label}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-medium leading-relaxed">{transaction.description || transaction.category}</p>
                              <p className="mt-1 text-muted-foreground">
                                Category: {transaction.category || "Goal Activity"}
                              </p>
                            </div>
                            <p className={`shrink-0 font-semibold ${historyMeta.signedAmountClassName}`}>
                              {historyMeta.signedAmount}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog({ ...transferDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Transfer to Goal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Transferring to:</p>
              <p className="font-semibold">{transferDialog.goalName}</p>
            </div>

            {/* Transfer Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Transfer Amount</label>
                <span className="text-xs text-muted-foreground">
                  Available: {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-1">
                {[50, 100, 500, 1000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setTransferAmount(amount.toString())}
                    disabled={amount > balance}
                    className="flex-1 text-xs"
                  >
                    {formatCurrency(amount, userProfile.currency, userProfile.customCurrency)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setTransferDialog({ open: false, goalId: "", goalName: "" })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={
                  !transferAmount ||
                  Number.parseFloat(transferAmount) <= 0 ||
                  Number.parseFloat(transferAmount) > balance
                }
                className="flex-1"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={investmentDialog.open} onOpenChange={(open) => setInvestmentDialog({ ...investmentDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Use for Investment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Using goal fund:</p>
              <p className="font-semibold">{investmentDialog.goalName}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Investment amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Market allocation</label>
              <Select value={investmentMarket} onValueChange={(value: "nepal" | "uk" | "split") => setInvestmentMarket(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">50 / 50 Split</SelectItem>
                  <SelectItem value="nepal">Nepal Only</SelectItem>
                  <SelectItem value="uk">UK Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={investmentNotes}
                onChange={(e) => setInvestmentNotes(e.target.value)}
                placeholder="Optional note about this investment use"
                rows={3}
              />
            </div>

            <div className="rounded-lg border bg-primary/5 p-3 text-xs text-muted-foreground">
              Easy mode keeps goal savings unchanged. Hard mode reduces saved balance and awards challenge points automatically.
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setInvestmentDialog({ open: false, goalId: "", goalName: "" })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvestmentUse}
                disabled={!investmentAmount || Number.parseFloat(investmentAmount) <= 0}
                className="flex-1"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
