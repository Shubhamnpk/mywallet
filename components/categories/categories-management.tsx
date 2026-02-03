"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

import { Plus, BarChart3, FolderOpen, Search, Filter, Calendar, Target, Trash2 } from "lucide-react"
import { getCurrencySymbol } from "@/lib/utils"
import { CategoryProgressCard } from "./category-progress-card"
import { CreateCategoryModal } from "./create-category-modal"
import { DeleteCategoryDialog } from "./delete-category-dialog"
import type { Category, Transaction, UserProfile } from "@/types/wallet"

interface CategoriesManagementProps {
  categories: Category[]
  transactions: Transaction[]
  userProfile: UserProfile
  onAddCategory?: (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => Category
  onUpdateCategory?: (id: string, updates: Partial<Category>) => void
  onDeleteCategory?: (id: string) => void
  onUpdateCategoryStats?: () => void
}

export function CategoriesManagement({
  categories,
  transactions,
  userProfile,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateCategoryStats,
}: CategoriesManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [sortBy, setSortBy] = useState<"usage" | "amount" | "transactions" | "name">("usage")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false)
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set())

  const currencySymbol = getCurrencySymbol(userProfile?.currency, (userProfile as any)?.customCurrency)

  // Calculate enhanced category statistics
  const categoryStats = useMemo(() => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

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
        Math.ceil(
          (now.getTime() - new Date(categoryTransactions[0]?.date || now).getTime()) / (30 * 24 * 60 * 60 * 1000),
        ),
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
  }, [categories, transactions])

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

  // Separate default and custom categories
  const defaultCategories = filteredCategories.filter((c) => c.isDefault)
  const customCategories = filteredCategories.filter((c) => !c.isDefault)


  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
  }

  const handleConfirmDelete = (categoryId: string) => {
    if (!onDeleteCategory) return
    onDeleteCategory(categoryId)
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

  const handleSelectAll = () => {
    if (selectedCategories.size === customCategories.length) {
      setSelectedCategories(new Set())
    } else {
      setSelectedCategories(new Set(customCategories.map(c => c.id)))
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
        if (onDeleteCategory) {
          onDeleteCategory(categoryId)
        }
      })
      setSelectedCategories(new Set())
      setBulkDeleteMode(false)
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
          {bulkDeleteMode && customCategories.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedCategories.size === customCategories.length}
                onCheckedChange={handleSelectAll}
                aria-label="Select all categories"
                className="hidden sm:flex"
              />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {selectedCategories.size} of {customCategories.length} selected
              </span>
              {selectedCategories.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Delete Selected ({selectedCategories.size})</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkDeleteMode(false)
                  setSelectedCategories(new Set())
                }}
              >
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          )}

          {!bulkDeleteMode && (
            <>
              {customCategories.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDeleteMode(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Bulk Delete</span>
                </Button>
              )}
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Category</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl border-border/60 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-primary/20 font-medium shadow-sm"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(value: "all" | "income" | "expense") => setFilterType(value)}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl border-border/60 bg-background/50 font-medium shadow-sm">
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
            <SelectTrigger className="w-[140px] h-10 rounded-xl border-border/60 bg-background/50 font-medium shadow-sm">
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20 shadow-xl relative overflow-hidden group col-span-2 md:col-span-1">
          <CardContent className="p-4 sm:p-5 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">Enabled Categories</p>
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <FolderOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                {categories.filter(c => !disabledCategories.has(c.id)).length}
              </p>
              <span className="text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                / {categories.length} Total
              </span>
            </div>
            <div className="mt-3 w-full bg-primary/10 h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${(categories.filter(c => !disabledCategories.has(c.id)).length / categories.length) * 100}%` }}
              />
            </div>
          </CardContent>
          {/* Ambient Glow */}
          <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Usage</p>
              <Target className="w-3.5 h-3.5 text-primary opacity-60" />
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono">
              {categoryStats.filter((c) => c.transactionCount > 0 && !disabledCategories.has(c.id)).length}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">With transactions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Spender</p>
              <BarChart3 className="w-3.5 h-3.5 text-amber-500 opacity-80" />
            </div>
            <p className="text-sm font-black truncate leading-tight">
              {categoryStats.length > 0
                ? categoryStats.sort((a, b) => b.totalSpent - a.totalSpent)[0]?.name
                : "None"}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
              {categoryStats.length > 0 && categoryStats.sort((a, b) => b.totalSpent - a.totalSpent)[0]
                ? currencySymbol + (categoryStats.sort((a, b) => b.totalSpent - a.totalSpent)[0].totalSpent).toLocaleString()
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Display */}
      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Custom ({customCategories.filter(c => !disabledCategories.has(c.id)).length})
          </TabsTrigger>
          <TabsTrigger value="default" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Default ({defaultCategories.filter(c => !disabledCategories.has(c.id)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="space-y-4">
          {customCategories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Custom Categories</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create custom categories to better organize your transactions
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {customCategories.map((category) => (
                <CategoryProgressCard
                  key={category.id}
                  category={category}
                  userProfile={userProfile}
                  onViewDetails={() => {
                    /* TODO: Implement details view */
                  }}
                  onEdit={() => setEditingCategory(category)}
                  onDelete={() => handleDeleteCategory(category)}
                  showActions={!bulkDeleteMode}
                  selectionMode={bulkDeleteMode}
                  isSelected={selectedCategories.has(category.id)}
                  onSelect={() => handleSelectCategory(category.id)}
                  isDisabled={disabledCategories.has(category.id)}
                  onToggleVisibility={() => handleToggleCategory(category.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="default" className="space-y-4">
          <div className="space-y-3">
            {defaultCategories.map((category) => (
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
                isDisabled={disabledCategories.has(category.id)}
                onToggleVisibility={() => handleToggleCategory(category.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Category Modal */}
      {
        editingCategory && (
          <CreateCategoryModal
            isOpen={!!editingCategory}
            onClose={() => setEditingCategory(null)}
            onCreateCategory={(categoryData) => {
              if (!onUpdateCategory || !editingCategory) return

              onUpdateCategory(editingCategory.id, {
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
          if (!onAddCategory) return

          // Check if category already exists
          const exists = categories.some(
            (c) => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.type === categoryData.type,
          )

          if (exists) {
            alert("A category with this name already exists for this type")
            return
          }

          onAddCategory({
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
