"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { useWalletData } from "@/contexts/wallet-data-context"

interface BudgetsListProps {
  budgets: Budget[]
  userProfile: UserProfile
  onAddBudget: (budget: any) => void
  onUpdateBudget?: (id: string, updates: Partial<Budget>) => void
  onDeleteBudget: (id: string) => void
}

export function BudgetsList({ budgets, userProfile, onAddBudget, onUpdateBudget, onDeleteBudget }: BudgetsListProps) {
  const { transactions } = useWalletData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [selectedBudgets, setSelectedBudgets] = useState<Set<string>>(new Set())
  const [historyBudget, setHistoryBudget] = useState<Budget | null>(null)
  const [historyRange, setHistoryRange] = useState<"active-month" | "this-week" | "all">("active-month")

  // Get currency symbol
  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency)
  }, [userProfile?.currency, (userProfile as any)?.customCurrency])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set())

  const getBudgetStatus = (budget: Budget) => {
    const percentage = (budget.spent / budget.limit) * 100
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
          aValue = a.spent
          bValue = b.spent
          break
        case "limit":
          aValue = a.limit
          bValue = b.limit
          break
        case "percentage":
          aValue = (a.spent / a.limit) * 100
          bValue = (b.spent / b.limit) * 100
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
  }, [budgets, searchQuery, statusFilter, sortBy, sortOrder])


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

  const isTimeWalletEnabled = Boolean(
    userProfile?.monthlyEarning > 0 &&
    userProfile?.workingHoursPerDay > 0 &&
    userProfile?.workingDaysPerMonth > 0,
  )

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
              Delete Selected ({selectedBudgets.size})
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
            const { status, color, icon: StatusIcon } = getBudgetStatus(budget)
            const percentage = Math.min((budget.spent / budget.limit) * 100, 100)
            const rawRemaining = budget.limit - budget.spent
            const remaining = Math.max(rawRemaining, 0)
            const overAmount = Math.max(budget.spent - budget.limit, 0)
            const isOverBudget = budget.spent > budget.limit
            const isExpanded = expandedBudgets.has(budget.id)
            const budgetTransactions = getBudgetTransactions(budget)

            const budgetTimeBreakdown = getTimeEquivalentBreakdown(budget.limit, userProfile)
            const spentTimeBreakdown = getTimeEquivalentBreakdown(budget.spent, userProfile)

            return (
              <Card key={budget.id} className={`transition border ${isOverBudget ? "border-red-200 bg-red-50/50" : ""}`}>
                {isOverBudget && (
                  <Alert className="m-4 mb-0 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Budget Exceeded!</strong> You have spent {formatCurrency(overAmount, userProfile.currency, userProfile.customCurrency)} over your limit.
                      {budget.emergencyUses > 0 && (
                        <span className="block mt-1">
                          Emergency uses remaining: <Badge variant="destructive">{budget.emergencyUses}</Badge>
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
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
                          onClick={() => handleEditBudget(budget)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteBudget(budget.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                          Spent: {formatCurrency(budget.spent, userProfile.currency, userProfile.customCurrency)}
                        </span>
                        <span>Budget: {formatCurrency(budget.limit, userProfile.currency, userProfile.customCurrency)}</span>
                      </div>
                      <Progress value={percentage} className="h-2 rounded-full" />
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
                      {isTimeWalletEnabled && (
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{historyBudget?.name || "Budget"} Transactions</DialogTitle>
          </DialogHeader>

          {historyBudget && (
            <div className="space-y-4">
              {(() => {
                const filteredHistory = filterTransactionsByRange(getBudgetTransactions(historyBudget), historyRange)
                const totalSpent = filteredHistory.reduce((sum, transaction) => sum + transaction.amount, 0)

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {(historyBudget.categories || []).map((category) => (
                          <Badge key={category} variant="outline">{category}</Badge>
                        ))}
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

                    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Transactions</p>
                        <p className="font-semibold">{filteredHistory.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Spent in range</p>
                        <p className="font-semibold text-red-600">
                          -{formatCurrency(totalSpent, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No budget transactions in this range.
                      </div>
                    ) : (
                      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                        {filteredHistory.map((transaction: Transaction) => (
                          <div key={transaction.id} className="rounded-lg border bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium leading-relaxed">
                                  {transaction.description || transaction.category}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span>{new Date(transaction.date).toLocaleDateString()}</span>
                                  <span>{transaction.category}</span>
                                </div>
                              </div>
                              <p className="shrink-0 font-semibold text-red-600">
                                -{formatCurrency(transaction.amount, userProfile.currency, userProfile.customCurrency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
