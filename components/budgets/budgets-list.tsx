"use client"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusCircle,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  Calendar,
  Edit,
  Receipt,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { BudgetDialog } from "./budget-dialog"
import type { Budget, Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import { getTimeEquivalentBreakdown, isTimeWalletEnabled } from "@/lib/wallet-utils"
import { useWalletData } from "@/contexts/wallet-data-context"
import { formatAppDate, getCalendarMonthRange, getCalendarSystem } from "@/lib/app-calendar"

interface BudgetsListProps {
  budgets: Budget[]
  userProfile: UserProfile
  onAddBudget: (budget: any) => void
  onUpdateBudget?: (id: string, updates: Partial<Budget>) => void
  onDeleteBudget: (id: string) => void
}

export function BudgetsList({ budgets, userProfile, onAddBudget, onUpdateBudget, onDeleteBudget }: BudgetsListProps) {
  const { transactions } = useWalletData()
  const calendarSystem = getCalendarSystem(userProfile.calendarSystem)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [selectedBudgets, setSelectedBudgets] = useState<Set<string>>(new Set())
  const [historyBudget, setHistoryBudget] = useState<Budget | null>(null)
  const [historyRange, setHistoryRange] = useState<"active-month" | "this-week" | "this-year" | "all">("active-month")

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set())

  const getPeriodRange = (budget: Budget, overrideRange?: "active-month" | "this-week" | "this-year" | "all") => {
    const now = new Date()
    let start: Date
    let end: Date
    const range = overrideRange || (budget.period === "monthly" ? "active-month" : budget.period === "weekly" ? "this-week" : budget.period === "yearly" ? "this-year" : "all")

    if (range === "all") {
      return { start: new Date(0), end: new Date(8640000000000000) }
    }

    if (range === "active-month") {
      return getCalendarMonthRange(now, calendarSystem)
    } else if (range === "this-week") {
      start = new Date(now)
      const day = start.getDay()
      const diff = day === 0 ? 6 : day - 1
      start.setDate(start.getDate() - diff)
      end = new Date(start)
      end.setDate(end.getDate() + 7)
    } else if (range === "this-year" || budget.period === "yearly") {
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear() + 1, 0, 1)
    } else {
      start = new Date(0)
      end = new Date(8640000000000000)
    }
    
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return { start, end }
  }

  const getCurrentPeriodSpent = (budget: Budget) => {
    const budgetTransactions = getBudgetTransactions(budget)
    const { start, end } = getPeriodRange(budget)

    return budgetTransactions
      .filter((transaction) => {
        const time = new Date(transaction.date).getTime()
        return time >= start.getTime() && time < end.getTime()
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  }

  const getBudgetStatus = (budget: Budget) => {
    const currentSpent = getCurrentPeriodSpent(budget)
    const percentage = (currentSpent / budget.limit) * 100
    if (percentage >= 100) return { status: "exceeded", color: "text-red-600", icon: AlertTriangle }
    if (percentage >= 80) return { status: "warning", color: "text-amber-600", icon: AlertTriangle }
    return { status: "good", color: "text-primary", icon: CheckCircle }
  }

  const filteredAndSortedBudgets = useMemo(() => {
    const filtered = budgets.filter((budget) => {
      const matchesSearch =
        (budget.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false) ||
        (budget.categories?.some((cat) => cat?.toLowerCase()?.includes(searchQuery.toLowerCase())) ?? false)

      if (!matchesSearch) return false

      if (statusFilter === "all") return true

      const { status } = getBudgetStatus(budget)
      return status === statusFilter
    })

    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || ""
          bValue = b.name?.toLowerCase() || ""
          break
        case "spent":
          aValue = getCurrentPeriodSpent(a)
          bValue = getCurrentPeriodSpent(b)
          break
        case "limit":
          aValue = a.limit
          bValue = b.limit
          break
        case "percentage":
          aValue = (getCurrentPeriodSpent(a) / a.limit) * 100
          bValue = (getCurrentPeriodSpent(b) / b.limit) * 100
          break
        default:
          return 0
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [budgets, searchQuery, statusFilter, sortBy, sortOrder, transactions, calendarSystem])


  const handleAddBudget = (budgetData: any) => {
    onAddBudget(budgetData)
    setDialogOpen(false)
  }

  const handleUpdateBudget = (id: string, budgetData: any) => {
    onUpdateBudget?.(id, budgetData)
    setDialogOpen(false)
    setEditingBudget(null)
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setDialogOpen(true)
  }

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedBudgets(new Set(filteredAndSortedBudgets.map(b => b.id)))
    } else {
      setSelectedBudgets(new Set())
    }
  }

  const handleSelectBudget = (budgetId: string, checked: boolean | "indeterminate") => {
    const isChecked = checked === true
    const newSelected = new Set(selectedBudgets)
    if (isChecked) {
      newSelected.add(budgetId)
    } else {
      newSelected.delete(budgetId)
    }
    setSelectedBudgets(newSelected)
  }

  const handleBulkDelete = () => {
    selectedBudgets.forEach(id => onDeleteBudget(id))
    setSelectedBudgets(new Set())
  }

  const toggleExpanded = (budgetId: string) => {
    const newExpanded = new Set(expandedBudgets)
    newExpanded.has(budgetId) ? newExpanded.delete(budgetId) : newExpanded.add(budgetId)
    setExpandedBudgets(newExpanded)
  }

  const timeWalletActive = isTimeWalletEnabled(userProfile)

  const getBudgetTransactions = (budget: Budget) => {
    const categorySet = new Set(
      [budget.category, ...(budget.categories || [])]
        .filter(Boolean)
        .map((category) => category.toLowerCase()),
    )

    return transactions
      .filter((transaction) =>
        transaction.type === "expense" &&
        !(
          transaction.allocationType === "goal" &&
          transaction.category === "Goal Contribution"
        ) &&
        categorySet.has((transaction.category || "").toLowerCase()),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const filterTransactionsByRange = (items: Transaction[], range: "active-month" | "this-week" | "this-year" | "all", budget: Budget) => {
    if (range === "all") return items
    const { start, end } = getPeriodRange(budget, range)
    return items.filter((transaction) => {
      const time = new Date(transaction.date).getTime()
      return time >= start.getTime() && time < end.getTime()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5" />
          Budgets ({filteredAndSortedBudgets.length})
        </h3>
        <div className="flex items-center gap-2">
          {selectedBudgets.size > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete} className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete ({selectedBudgets.size})
            </Button>
          )}
          <Button onClick={() => { setEditingBudget(null); setDialogOpen(true) }} className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Filters & Controls */}
      {budgets.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search budgets or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="good">On Track</SelectItem>
                <SelectItem value="warning">Near Limit</SelectItem>
                <SelectItem value="exceeded">Over Budget</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="spent">Spent</SelectItem>
                <SelectItem value="limit">Budget</SelectItem>
                <SelectItem value="percentage">Usage %</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Select All Section */}
      {filteredAndSortedBudgets.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <Checkbox
            checked={selectedBudgets.size === filteredAndSortedBudgets.length && filteredAndSortedBudgets.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedBudgets.size === 0
              ? "Select all budgets"
              : `${selectedBudgets.size} of ${filteredAndSortedBudgets.length} budgets selected`}
          </span>
        </div>
      )}

      {/* States */}
      {budgets.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No budgets yet</h3>
            <p className="text-muted-foreground mb-4">Start by creating your first smart budget today.</p>
            <Button onClick={() => setDialogOpen(true)} className=" gap-2">
              <PlusCircle className="w-4 h-4" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      ) : filteredAndSortedBudgets.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filters.</p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all") }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedBudgets.map((budget) => {
            const { status, icon: StatusIcon } = getBudgetStatus(budget)
            const currentSpent = getCurrentPeriodSpent(budget)
            const percentage = Math.min((currentSpent / budget.limit) * 100, 100)
            const rawRemaining = budget.limit - currentSpent
            const remaining = Math.max(rawRemaining, 0)
            const overAmount = Math.max(currentSpent - budget.limit, 0)
            const isOverBudget = currentSpent > budget.limit
            const isExpanded = expandedBudgets.has(budget.id)
            const budgetTransactions = getBudgetTransactions(budget)

            const budgetTimeBreakdown = getTimeEquivalentBreakdown(budget.limit, userProfile)
            const spentTimeBreakdown = getTimeEquivalentBreakdown(currentSpent, userProfile)

            return (
              <Card key={budget.id} className={`transition-all duration-300 border ${isOverBudget ? "border-destructive/40 shadow-sm shadow-destructive/10" : ""}`}>
                {isOverBudget && (
                  <div className="mx-4 mt-4 px-3 py-1 bg-destructive/10 text-destructive text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider rounded-full flex flex-wrap items-center gap-1.5 w-fit border border-destructive/20 animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Limit Exceeded
                    </div>
                    {budget.emergencyUses > 0 && (
                      <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-destructive/30 text-[9px] sm:text-[10px] opacity-80">
                        {budget.emergencyUses} Emergency Reserves Remaining
                      </div>
                    )}
                  </div>
                )}

                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(budget.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedBudgets.has(budget.id)}
                          onCheckedChange={(checked) => handleSelectBudget(budget.id, checked as boolean)}
                        />
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-2 cursor-pointer flex-1">
                            <Target className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">{budget.name}</CardTitle>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </CollapsibleTrigger>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={status === "exceeded" ? "destructive" : status === "warning" ? "secondary" : "default"}
                          className="flex items-center gap-1"
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status === "exceeded" ? "Over Budget" : status === "warning" ? "Near Limit" : "On Track"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditBudget(budget)
                          }}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteBudget(budget.id)
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div
                      className="space-y-2 mt-3 cursor-pointer hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={() => {
                        setHistoryRange("active-month")
                        setHistoryBudget(budget)
                      }}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1 font-medium">
                          Spent: {formatCurrency(currentSpent, userProfile.currency, userProfile.customCurrency)}
                          {isOverBudget && (
                            <span className="text-destructive text-[10px] ml-1 px-1.5 py-0.5 bg-destructive/10 rounded">
                              (+{formatCurrency(overAmount, userProfile.currency, userProfile.customCurrency)})
                            </span>
                          )}
                        </span>
                        <span>Budget: {formatCurrency(budget.limit, userProfile.currency, userProfile.customCurrency)}</span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2 rounded-full" 
                        indicatorClassName={isOverBudget ? "bg-destructive transition-all duration-500" : ""}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{percentage.toFixed(1)}% used</span>
                        <span>
                          {rawRemaining >= 0
                            ? `${formatCurrency(remaining, userProfile.currency, userProfile.customCurrency)} remaining`
                            : `${formatCurrency(overAmount, userProfile.currency, userProfile.customCurrency)} over`}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      {timeWalletActive && (
                        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="w-4 h-4 text-amber-600" />
                            Time Investment
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Budget represents</p>
                              <p className="font-medium">{budgetTimeBreakdown ? budgetTimeBreakdown.formatted.userFriendly : "0m"} of work</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Already spent</p>
                              <p className="font-medium">{spentTimeBreakdown ? spentTimeBreakdown.formatted.userFriendly : "0m"} of work</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Categories */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="w-4 h-4 text-blue-600" />
                          Covered Categories
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {budget.categories?.map((category) => (
                            <Badge key={category} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHistoryRange("active-month")
                            setHistoryBudget(budget)
                          }}
                          className="flex items-center gap-2"
                        >
                          <Receipt className="w-4 h-4" />
                          View Transactions ({budgetTransactions.length})
                        </Button>
                      </div>

                      {/* Meta Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Period: {budget.period}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span>Emergency uses: {budget.emergencyUses || 3}</span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <BudgetDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingBudget(null) }}
        userProfile={userProfile}
        onAddBudget={handleAddBudget}
        editingBudget={editingBudget || undefined}
        onUpdateBudget={handleUpdateBudget}
      />

      <Dialog open={Boolean(historyBudget)} onOpenChange={(open) => { if (!open) setHistoryBudget(null) }}>
        <DialogContent className="flex h-[85vh] max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Receipt className="w-5 h-5 text-primary" />
              {historyBudget?.name || "Budget"} Transactions
            </DialogTitle>
          </DialogHeader>

          {historyBudget && (
            <div className="flex-1 flex flex-col min-h-0">
              {(() => {
                const filteredHistory = filterTransactionsByRange(getBudgetTransactions(historyBudget), historyRange, historyBudget)
                const totalSpent = filteredHistory.reduce((sum, transaction) => sum + transaction.amount, 0)

                return (
                  <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden p-6 pt-4">
                    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Active Categories</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(historyBudget.categories || []).map((category) => (
                            <Badge key={category} variant="secondary" className="bg-background/50 border-primary/10">{category}</Badge>
                          ))}
                        </div>
                      </div>

                      <Select
                        value={historyRange}
                        onValueChange={(value: "active-month" | "this-week" | "this-year" | "all") => setHistoryRange(value)}
                      >
                        <SelectTrigger className="w-[170px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active-month">Active Month</SelectItem>
                          <SelectItem value="this-week">This Week</SelectItem>
                          <SelectItem value="this-year">This Year</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-4">
                      <div className="rounded-xl border bg-background p-4 shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Count</p>
                        <p className="text-2xl font-bold">{filteredHistory.length}</p>
                      </div>
                      <div className="rounded-xl border bg-background p-4 shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Spent in Range</p>
                        <p className="text-2xl font-bold text-destructive">
                          -{formatCurrency(totalSpent, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col pt-2">
                      <h4 className="mb-2 shrink-0 text-sm font-medium text-muted-foreground">Transaction Details</h4>
                       {filteredHistory.length === 0 ? (
                        <div className="flex-1 rounded-xl border border-dashed flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground bg-muted/5 dark:bg-muted/10">
                          <Receipt className="w-10 h-10 mb-2 opacity-20" />
                          No transactions found for this period.
                        </div>
                      ) : (
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-2 [-webkit-overflow-scrolling:touch] scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                          {filteredHistory.map((transaction: Transaction) => (
                            <div key={transaction.id} className="group rounded-xl border bg-background p-4 hover:shadow-md transition-all duration-200 hover:border-primary/20">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 bg-muted dark:bg-muted/80 px-1.5 py-0.5 rounded">
                                      {formatAppDate(transaction.date, calendarSystem)}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-primary/60 bg-primary/5 dark:bg-primary/10 px-1.5 py-0.5 rounded">
                                      {transaction.category}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-sm leading-tight text-foreground/90 group-hover:text-foreground transition-colors">
                                    {transaction.description || transaction.category}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-base font-bold text-destructive dark:text-red-400">
                                    -{formatCurrency(transaction.amount, userProfile.currency, userProfile.customCurrency)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
