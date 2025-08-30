"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Target,
  Plus,
  Calendar,
  DollarSign,
  Send,
  ArrowRight,
  Search,
  Filter,
  ChevronDown,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import { GoalDialog } from "./goal-dialog"
import { useWalletData } from "@/contexts/wallet-data-context"
import type { Goal, UserProfile } from "@/types/wallet"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

interface EnhancedGoalsListProps {
  goals: Goal[]
  userProfile: UserProfile
}

type FilterType = "all" | "active" | "completed" | "overdue"
type SortType = "progress" | "target-date" | "amount" | "name"

export function EnhancedGoalsList({ goals, userProfile }: EnhancedGoalsListProps) {
  const { transferToGoal, balance, updateGoal, deleteGoal } = useWalletData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; goalId: string; goalName: string }>({
    open: false,
    goalId: "",
    goalName: "",
  })
  const [transferAmount, setTransferAmount] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortType, setSortType] = useState<SortType>("progress")
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  const filteredAndSortedGoals = useMemo(() => {

    const filtered = goals.filter((goal) => {
      const matchesSearch =
        goal.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        (goal.category?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false)

      const progress = (goal.currentAmount / goal.targetAmount) * 100
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
          const progressA = (a.currentAmount / a.targetAmount) * 100
          const progressB = (b.currentAmount / b.targetAmount) * 100
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
    const hourlyRate =
      userProfile.workingDaysPerMonth && userProfile.workingHoursPerDay
        ? userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)
        : 0
    if (hourlyRate <= 0) return "0m"
    const minutes = (amount / hourlyRate) * 60
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m` : `${Math.floor(minutes)}m`
  }

  const handleTransfer = async () => {
    const amount = Number.parseFloat(transferAmount)
    if (amount <= 0 || amount > balance) return

    try {
      const result = transferToGoal(transferDialog.goalId, amount)
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
    const progress = (goal.currentAmount / goal.targetAmount) * 100
    const isCompleted = progress >= 100
    const isOverdue = new Date(goal.targetDate) < new Date() && !isCompleted

    if (isCompleted) return { status: "completed", color: "bg-accent", icon: CheckCircle2 }
    if (isOverdue) return { status: "overdue", color: "bg-red-600", icon: AlertCircle }
    if (progress > 75) return { status: "near-completion", color: "bg-amber-600", icon: TrendingUp }
    return { status: "active", color: "bg-blue-600", icon: Target }
  }

  return (
    <div className="space-y-4">
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
        <div className="grid gap-4">
          {filteredAndSortedGoals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100
            const remaining = goal.targetAmount - goal.currentAmount
            const isCompleted = goal.currentAmount >= goal.targetAmount
            const isExpanded = expandedGoals.has(goal.id)
            const goalStatus = getGoalStatus(goal)
            const StatusIcon = goalStatus.icon
            const isSelected = selectedGoals.has(goal.id)

            return (
              <Card
                key={goal.id}
                className={`${isCompleted ? "border-accent/20 bg-accent/5" : ""} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleGoalExpansion(goal.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectGoal(goal.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <CardTitle className="text-lg flex items-center gap-2">
                            <StatusIcon className="w-5 h-5" />
                            {goal.title || goal.name}
                            <Badge variant="secondary" className={`${goalStatus.color} text-white`}>
                              {progress.toFixed(0)}%
                            </Badge>
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Target</p>
                            <p className="font-semibold">
                              {formatCurrency(goal.targetAmount, userProfile.currency, userProfile.customCurrency)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditGoal(goal)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Goal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Goal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>

                      <div className="mt-2 ml-8">
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Current</p>
                            <p className="font-medium">{formatCurrency(goal.currentAmount, userProfile.currency, userProfile.customCurrency)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Target Date</p>
                            <p className="font-medium">{new Date(goal.targetDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

            {goal.description && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{goal.description}</p>
                        </div>
                      )}

                      {!isCompleted && (
                        <>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Remaining to Goal</p>
                            </div>
                            <p className="font-semibold text-amber-600">{formatCurrency(remaining, userProfile.currency, userProfile.customCurrency)}
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({formatTimeEquivalent(remaining)} of work)
                              </span>
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTransferDialog({ open: true, goalId: goal.id, goalName: goal.title || goal.name || "" })}
                              className="flex items-center gap-2"
                              disabled={balance <= 0}
                            >
                              <Send className="w-4 h-4" />
                              Transfer Money
                            </Button>
                            <div className="text-xs text-muted-foreground flex items-center">
                                Available: {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)}
                              </div>
                          </div>
                        </>
                      )}

                      {goal.category && (
                        <Badge variant="outline" className="w-fit">
                          {goal.category}
                        </Badge>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}

      <GoalDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingGoal(null)
        }}
        userProfile={userProfile}
        editingGoal={editingGoal}
      />

      <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog({ ...transferDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-accent" />
              Transfer to Goal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Transferring to:</p>
              <p className="font-semibold">{transferDialog.goalName}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={balance}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Available balance: {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)}</p>
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
    </div>
  )
}
