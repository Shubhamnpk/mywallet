"use client"
import { useState, useRef, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, BarChart3, FolderOpen, Search, Filter, Target, Trash2 } from "lucide-react"
import { getCurrencySymbol, cn } from "@/lib/utils"
import { CategoryProgressCard } from "./category-progress-card"
import { CreateCategoryModal } from "./create-category-modal"
import { DeleteCategoryDialog } from "./delete-category-dialog"
import type { Category } from "@/types/wallet"
import { getCalendarMonthKey } from "@/lib/app-calendar"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { useCategories } from "@/contexts/categories-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useUser } from "@/contexts/user-context"

export function CategoriesManagement() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { transactions } = useTransactions()
  const { userProfile } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [sortBy, setSortBy] = useState<"usage" | "amount" | "transactions" | "name">("usage")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set())
  const [currentStatIndex, setCurrentStatIndex] = useState(0)
  const statScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = statScrollRef.current
    if (!container) return
    const scrollHandler = () => {
      if (!container) return
      const cards = container.querySelectorAll<HTMLElement>("[data-stat-card]")
      if (cards.length === 0) return
      const scrollLeft = container.scrollLeft
      const cardWidth = cards[0].offsetWidth + 12
      const newIndex = Math.min(cards.length - 1, Math.max(0, Math.round(scrollLeft / cardWidth)))
      setCurrentStatIndex(prev => (prev !== newIndex ? newIndex : prev))
    }
    container.addEventListener("scroll", scrollHandler, { passive: true })
    return () => container.removeEventListener("scroll", scrollHandler)
  }, [])
  if (!userProfile) return null

  const currencySymbol = getCurrencySymbol(userProfile.currency, (userProfile as any)?.customCurrency)
  const calendarSystem = useCalendarSystem()

  // Calculate enhanced category statistics
  const categoryStats = useMemo(() => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    return categories.map((category) => {
      const categoryTransactions = transactions.filter((t) => t.category === category.name)
      const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
      const transactionCount = categoryTransactions.length

      // Calculate percentage of total spending for progress bars
      const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
      const percentage = totalExpenses > 0 ? (totalSpent / totalExpenses) * 100 : 0

      // Calculate monthly average
      const monthsOfData = Math.max(
        1,
        new Set(categoryTransactions.map((transaction) => getCalendarMonthKey(transaction.date, calendarSystem)).filter(Boolean)).size,
      )
      const monthlyAverage = totalSpent / monthsOfData

      // Calculate weekly trend
      const thisWeekTransactions = categoryTransactions.filter((t) => new Date(t.date) >= oneWeekAgo)
      const lastWeekTransactions = categoryTransactions.filter((t) => {
        const date = new Date(t.date)
        return date >= new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && date < oneWeekAgo
      })

      const thisWeekSpent = thisWeekTransactions.reduce((sum, t) => sum + t.amount, 0)
      const lastWeekSpent = lastWeekTransactions.reduce((sum, t) => sum + t.amount, 0)
      const weeklyTrend = lastWeekSpent > 0 ? ((thisWeekSpent - lastWeekSpent) / lastWeekSpent) * 100 : 0

      // Last transaction date
      const lastTransactionDate =
        categoryTransactions.length > 0
          ? categoryTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : undefined

      return {
        ...category,
        totalSpent,
        transactionCount,
        percentage: Math.min(percentage, 100),
        monthlyAverage,
        weeklyTrend,
        lastTransactionDate,
      }
    })
  }, [categories, transactions, userProfile.calendarSystem])

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    const filtered = categoryStats.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || category.type === filterType
      const isEnabled = !disabledCategories.has(category.id)
      return matchesSearch && matchesType && isEnabled
    })

    // Sort categories
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "usage":
          return b.percentage - a.percentage
        case "amount":
          return b.totalSpent - a.totalSpent
        case "transactions":
          return b.transactionCount - a.transactionCount
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [categoryStats, searchTerm, filterType, sortBy])

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
  }

  const handleConfirmDelete = (categoryId: string) => {
    deleteCategory(categoryId)
    setDeletingCategory(null)
  }

  const handleToggleCategory = (categoryId: string) => {
    setDisabledCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleLongPressCategory = (categoryId: string) => {
    handleSelectCategory(categoryId)
  }

  const handleSelectAll = () => {
    if (selectedCategories.size === filteredCategories.length) {
      setSelectedCategories(new Set())
    } else {
      setSelectedCategories(new Set(filteredCategories.map(c => c.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedCategories.size === 0) return

    // Check if any selected categories are in use
    const categoriesInUse = Array.from(selectedCategories).filter(categoryId => {
      const category = categories.find(c => c.id === categoryId)
      if (!category) return false
      return transactions.some(t => t.category === category.name)
    })

    if (categoriesInUse.length > 0) {
      alert(`Cannot delete ${categoriesInUse.length} category(ies) that are currently in use. Please remove them from transactions first.`)
      return
    }

    if (confirm(`Are you sure you want to delete ${selectedCategories.size} selected categories? This action cannot be undone.`)) {
      selectedCategories.forEach(categoryId => {
        deleteCategory(categoryId)
      })
      setSelectedCategories(new Set())
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-row gap-2 sm:gap-4 items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Category
        </h3>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Category</span>
          </Button>
        </div>
      </div>

      {(() => {
        const enabledCount = categories.filter(c => !disabledCategories.has(c.id)).length
        const activeCount = categoryStats.filter((c) => c.transactionCount > 0 && !disabledCategories.has(c.id)).length
        const topSpender = categoryStats.length > 0 ? [...categoryStats].sort((a, b) => b.totalSpent - a.totalSpent)[0] : null

        const statCards = [
          { label: "Enabled", value: `${enabledCount}`, sub: `/ ${categories.length} Total`, icon: FolderOpen, iconClass: "text-primary bg-primary/10", bar: true },
          { label: "Active Usage", value: `${activeCount}`, sub: "with transactions", icon: Target, iconClass: "text-primary opacity-60 bg-primary/10", bar: false },
          { label: "Top Spender", value: topSpender?.name ?? "None", sub: topSpender ? currencySymbol + topSpender.totalSpent.toLocaleString() : "-", icon: BarChart3, iconClass: "text-warning opacity-80 bg-warning/10", bar: false },
        ]

        return (
          <>
            {/* Mobile stat carousel (md:hidden) */}
            <div className="md:hidden mb-1 w-full">
              <div
                ref={statScrollRef}
                className="overflow-x-auto px-1 pb-2 hide-scrollbars w-full"
                style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}
              >
                <div className="flex gap-3" style={{ width: "calc(300% + 24px)" }}>
                  {statCards.map((stat, index) => (
                    <div
                      key={stat.label}
                      data-stat-card={index}
                      className="flex-shrink-0"
                      style={{ width: "calc(100%/3 - 8px)", scrollSnapAlign: "start", willChange: "transform", transform: "translateZ(0)" }}
                    >
                      <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md h-full">
                        <CardContent className="p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                            <div className={cn("p-1.5 rounded-lg", stat.iconClass)}>
                              <stat.icon className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <p className="text-lg font-black font-mono tracking-tight truncate">{stat.value}</p>
                          <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider truncate">{stat.sub}</p>
                          {stat.bar && (
                            <div className="mt-2 w-full bg-primary/10 h-1 rounded-full overflow-hidden">
                              <div className="bg-primary h-full transition-all duration-500 rounded-full" style={{ width: categories.length > 0 ? `${(enabledCount / categories.length) * 100}%` : "0%" }} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-1 relative z-10">
                {statCards.map((stat, index) => (
                  <button
                    key={stat.label}
                    type="button"
                    aria-label={`Go to ${stat.label} card`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const container = statScrollRef.current
                      if (container) {
                        const cards = container.querySelectorAll("[data-stat-card]")
                        if (cards[index]) {
                          container.style.scrollSnapType = "none"
                          cards[index].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
                          setTimeout(() => { container.style.scrollSnapType = "x mandatory" }, 400)
                        }
                        setCurrentStatIndex(index)
                      }
                    }}
                    className={cn(
                      "relative transition-all duration-300 ease-out rounded-full cursor-pointer",
                      currentStatIndex === index ? "w-6 h-2 bg-primary scale-110" : "w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/60 hover:scale-105"
                    )}
                  />
                ))}
              </div>
            </div>
          </>
        )
      })()}
      {(() => {
        const enabledCount = categories.filter(c => !disabledCategories.has(c.id)).length
        const activeCount = categoryStats.filter((c) => c.transactionCount > 0 && !disabledCategories.has(c.id)).length
        const topSpender = categoryStats.length > 0 ? [...categoryStats].sort((a, b) => b.totalSpent - a.totalSpent)[0] : null

        return (
          <div className="hidden md:grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20 shadow-xl relative overflow-hidden group">
          <CardContent className="p-3.5 sm:p-4 relative z-10">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">Enabled Categories</p>
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <FolderOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                {enabledCount}
              </p>
              <span className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                / {categories.length} Total
              </span>
            </div>
            <div className="mt-2 w-full bg-primary/10 h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: categories.length > 0 ? `${(enabledCount / categories.length) * 100}%` : "0%" }}
              />
            </div>
          </CardContent>
          {/* Ambient Glow */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Usage</p>
              <Target className="w-3.5 h-3.5 text-primary opacity-60" />
            </div>
            <p className="text-lg sm:text-xl font-black font-mono">
              {activeCount}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">With transactions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Spender</p>
              <BarChart3 className="w-3.5 h-3.5 text-warning opacity-80" />
            </div>
            <p className="text-sm font-black truncate leading-tight">
              {topSpender?.name ?? "None"}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
              {topSpender ? currencySymbol + topSpender.totalSpent.toLocaleString() : "-"}
            </p>
          </CardContent>
        </Card>
      </div>
        )
      })()}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-xl border-border/60 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-primary/20 font-medium shadow-sm"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(value: "all" | "income" | "expense") => setFilterType(value)}>
            <SelectTrigger className="w-[140px] h-12 rounded-xl border-border/60 bg-background/50 font-medium shadow-sm">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income Only</SelectItem>
              <SelectItem value="expense">Expense Only</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value: "usage" | "amount" | "transactions" | "name") => setSortBy(value)}
          >
            <SelectTrigger className="w-[140px] h-12 rounded-xl border-border/60 bg-background/50 font-medium shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="usage">By Usage %</SelectItem>
              <SelectItem value="amount">By Amount</SelectItem>
              <SelectItem value="transactions">By Count</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Select All Section */}
      {filteredCategories.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedCategories.size === filteredCategories.length && filteredCategories.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedCategories.size === 0
                ? "Select all categories"
                : `${selectedCategories.size} of ${filteredCategories.length} categories selected`}
            </span>
          </div>
          {selectedCategories.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedCategories.size})
            </Button>
          )}
        </div>
      )}

      {/* Categories Display */}
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">All Categories</h4>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {filteredCategories.length}
            </span>
          </div>

          {filteredCategories.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FolderOpen className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <h3 className="text-base font-medium mb-1">No Categories Found</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-xs">
                  {searchTerm || filterType !== "all"
                    ? "No categories match your search or filter."
                    : "Create your own to organize transactions exactly how you want."}
                </p>
                {!searchTerm && filterType === "all" && (
                  <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" size="sm">
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Create Category
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCategories.map((category) => (
                <CategoryProgressCard
                  key={category.id}
                  category={category}
                  userProfile={userProfile}
                  onViewDetails={() => {
                    /* TODO: Implement details view */
                  }}
                  onEdit={() => setEditingCategory(category)}
                  onDelete={() => handleDeleteCategory(category)}
                  showActions={true}
                  selectionMode={true}
                  isSelected={selectedCategories.has(category.id)}
                  onSelect={() => handleSelectCategory(category.id)}
                  isDisabled={disabledCategories.has(category.id)}
                  onToggleVisibility={() => handleToggleCategory(category.id)}
                  onLongPress={() => handleLongPressCategory(category.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Category Modal */}
      {
        editingCategory && (
          <CreateCategoryModal
            isOpen={!!editingCategory}
            onClose={() => setEditingCategory(null)}
            onCreateCategory={(categoryData) => {
              if (!editingCategory) return

              updateCategory(editingCategory.id, {
                name: categoryData.name,
                color: categoryData.color,
                icon: categoryData.icon,
              })
              setEditingCategory(null)
            }}
            categoryType={editingCategory.type}
          />
        )
      }

      {/* New Modern Category Creation Modal */}
      <CreateCategoryModal
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onCreateCategory={(categoryData) => {
          // Check if category already exists
          const exists = categories.some(
            (c) => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.type === categoryData.type,
          )

          if (exists) {
            alert("A category with this name already exists for this type")
            return
          }

          addCategory({
            name: categoryData.name,
            type: categoryData.type,
            color: categoryData.color,
            icon: categoryData.icon,
            isDefault: false,
          })
        }}
        categoryType="expense"
      />

      {/* Delete Category Confirmation Dialog */}
      <DeleteCategoryDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        category={deletingCategory}
        transactions={transactions}
        onConfirmDelete={handleConfirmDelete}
      />
    </div >
  )
}
