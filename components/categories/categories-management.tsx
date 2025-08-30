"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, BarChart3, FolderOpen, Search, Filter, Calendar, Target } from "lucide-react"
import { getCurrencySymbol } from "@/lib/utils"
import { CategoryProgressCard } from "./category-progress-card"
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
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("expense")
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6")

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
      return matchesSearch && matchesType
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

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !onAddCategory) return

    // Check if category already exists
    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase() && c.type === newCategoryType,
    )

    if (exists) {
      alert("A category with this name already exists for this type")
      return
    }

    onAddCategory({
      name: newCategoryName.trim(),
      type: newCategoryType,
      color: newCategoryColor,
      isDefault: false,
    })

    // Reset form
    setNewCategoryName("")
    setNewCategoryType("expense")
    setNewCategoryColor("#3b82f6")
    setIsAddDialogOpen(false)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryColor(category.color || "#3b82f6")
  }

  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategoryName.trim() || !onUpdateCategory) return

    onUpdateCategory(editingCategory.id, {
      name: newCategoryName.trim(),
      color: newCategoryColor,
    })

    setEditingCategory(null)
    setNewCategoryName("")
    setNewCategoryColor("#3b82f6")
  }

  const handleDeleteCategory = (category: Category) => {
    if (!onDeleteCategory) return

    if (category.isDefault) {
      alert("Cannot delete default categories")
      return
    }

    // Check if category is being used
    const isUsed = transactions.some((t) => t.category === category.name)
    if (isUsed) {
      const confirmDelete = confirm(
        `This category is used in ${category.transactionCount} transactions. Deleting it may affect your transaction history. Continue?`,
      )
      if (!confirmDelete) return
    }

    onDeleteCategory(category.id)
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value: "all" | "income" | "expense") => setFilterType(value)}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income Only</SelectItem>
                <SelectItem value="expense">Expense Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value: "usage" | "amount" | "transactions" | "name") => setSortBy(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usage">By Usage %</SelectItem>
                <SelectItem value="amount">By Amount</SelectItem>
                <SelectItem value="transactions">By Count</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Coffee, Subscriptions, Consulting"
                />
              </div>

              <div>
                <Label htmlFor="category-type">Type</Label>
                <Select
                  value={newCategoryType}
                  onValueChange={(value: "income" | "expense") => setNewCategoryType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category-color">Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Select category color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-12 h-10 rounded border border-input"
                  />
                  <Input
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddCategory} className="flex-1">
                  Create Category
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Categories</p>
                <p className="text-xl font-bold">{categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Active Categories</p>
                <p className="text-xl font-bold">{categoryStats.filter((c) => c.transactionCount > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Top Category</p>
                <p className="text-sm font-bold truncate">
                  {categoryStats.length > 0
                    ? categoryStats.sort((a, b) => b.totalSpent - a.totalSpent)[0]?.name
                    : "None"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-xl font-bold">
                  {currencySymbol}
                  {categoryStats.reduce((sum, c) => sum + c.monthlyAverage, 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Display */}
      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Custom ({customCategories.length})
          </TabsTrigger>
          <TabsTrigger value="default" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Default ({defaultCategories.length})
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customCategories.map((category) => (
                <CategoryProgressCard
                  key={category.id}
                  category={category}
                  userProfile={userProfile}
                  onViewDetails={() => {
                    /* TODO: Implement details view */
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="default" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {defaultCategories.map((category) => (
              <CategoryProgressCard
                key={category.id}
                category={category}
                userProfile={userProfile}
                onViewDetails={() => {
                  /* TODO: Implement details view */
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
              />
            </div>

            <div>
              <Label htmlFor="edit-category-color">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Edit category color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-12 h-10 rounded border border-input"
                />
                <Input
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditingCategory(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateCategory} className="flex-1">
                Update Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
