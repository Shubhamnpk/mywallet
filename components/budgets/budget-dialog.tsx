"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Target, Clock, Plus, X, DollarSign, Calendar, Shield, Tag, Search, Lightbulb, ChevronDown } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCurrencySymbol } from "@/lib/currency"
import { getDefaultCategoryNames } from "@/lib/categories"
import type { UserProfile, Budget } from "@/types/wallet"

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfile: UserProfile
  onAddBudget: (budget: any) => void
  editingBudget?: Budget
  onUpdateBudget?: (id: string, updates: Partial<Budget>) => void
}

const periods = ["weekly", "monthly", "yearly"]

export function BudgetDialog({ open, onOpenChange, userProfile, onAddBudget, editingBudget, onUpdateBudget }: BudgetDialogProps) {
  const { categories, addCategory } = useWalletData()
  const [amount, setAmount] = useState("")
  const [budgetName, setBudgetName] = useState("")
  const [period, setPeriod] = useState("monthly")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [customCategory, setCustomCategory] = useState("")
  const [emergencyUses, setEmergencyUses] = useState("3")
  const [searchTerm, setSearchTerm] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showTips, setShowTips] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editingBudget) {
      setAmount(editingBudget.limit.toString())
      setBudgetName(editingBudget.name)
      setPeriod(editingBudget.period)
      setSelectedCategories(editingBudget.categories || [])
      setEmergencyUses(editingBudget.emergencyUses?.toString() || "3")
      setCustomCategory("")
      setSearchTerm("")
      setErrors({})
    } else {
      // Reset form for new budget
      setAmount("")
      setBudgetName("")
      setSelectedCategories([])
      setPeriod("monthly")
      setEmergencyUses("3")
      setCustomCategory("")
      setSearchTerm("")
      setErrors({})
    }
  }, [editingBudget])

  // Get expense categories from the context, falling back to default categories
  const expenseCategories = useMemo(() => {
    const contextCategories = categories
      .filter((cat) => cat.type === "expense")
      .map((cat) => cat.name)

    // If no categories in context, use default categories
    if (contextCategories.length === 0) {
      return getDefaultCategoryNames("expense")
    }

    return contextCategories.sort()
  }, [categories])

  // Get currency symbol
  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency)
  }, [userProfile?.currency, (userProfile as any)?.customCurrency])

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return expenseCategories
    return expenseCategories.filter(category =>
      category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [expenseCategories, searchTerm])

  const timeEquivalentBreakdown = useMemo(() => {
    if (!amount || !userProfile) return null
    const { getTimeEquivalentBreakdown } = require("@/lib/wallet-utils")
    return getTimeEquivalentBreakdown(Number.parseFloat(amount), userProfile)
  }, [amount, userProfile])

  const timeText = timeEquivalentBreakdown ? timeEquivalentBreakdown.formatted.userFriendly : "0m"

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const addCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim())) {
      // Add the category to the global categories if it doesn't exist
      const existingCategory = categories.find(
        (cat) => cat.name.toLowerCase() === customCategory.trim().toLowerCase() && cat.type === "expense"
      )

      if (!existingCategory && addCategory) {
        addCategory({
          name: customCategory.trim(),
          type: "expense",
          color: "#3b82f6",
          isDefault: false,
        })
      }

      setSelectedCategories((prev) => [...prev, customCategory.trim()])
      setCustomCategory("")
    }
  }

  const removeCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!budgetName.trim()) {
      newErrors.budgetName = "Budget name is required"
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      newErrors.amount = "Please enter a valid positive amount"
    }

    if (selectedCategories.length === 0) {
      newErrors.categories = "Please select at least one category"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const budgetData = {
      name: budgetName.trim(),
      limit: Number.parseFloat(amount),
      categories: selectedCategories,
      period,
      emergencyUses: Number.parseInt(emergencyUses),
      ...(editingBudget ? {} : { createdAt: new Date().toISOString() }),
    }

    if (editingBudget && onUpdateBudget) {
      onUpdateBudget(editingBudget.id, budgetData as Partial<Budget>)
    } else {
      onAddBudget(budgetData)
    }

    // Reset form
    setAmount("")
    setBudgetName("")
    setSelectedCategories([])
    setPeriod("monthly")
    setEmergencyUses("3")
    setSearchTerm("")
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {editingBudget ? "Edit Budget" : "Create Smart Budget"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-name" className="flex items-center gap-2">
                  Budget Name
                </Label>
                <Input
                  id="budget-name"
                  type="text"
                  placeholder="e.g., Monthly Expenses, School Budget"
                  value={budgetName}
                  onChange={(e) => {
                    setBudgetName(e.target.value)
                    if (errors.budgetName) {
                      setErrors(prev => ({ ...prev, budgetName: "" }))
                    }
                  }}
                  className={errors.budgetName ? "border-destructive" : ""}
                  required
                />
                {errors.budgetName && (
                  <p className="text-sm text-destructive">{errors.budgetName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget-amount" className="flex items-center gap-2">
                  Budget Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                    {currencySymbol}
                  </span>
                  <Input
                    id="budget-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      if (errors.amount) {
                        setErrors(prev => ({ ...prev, amount: "" }))
                      }
                    }}
                    className={`pl-10 ${errors.amount ? "border-destructive" : ""}`}
                    required
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount}</p>
                )}

                {amount && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border">
                    <Clock className="w-4 h-4" />
                    <span>This budget represents <strong>{timeText}</strong> of work time</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget-period">Period</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Emergency Uses Allowed
                  </Label>
                  <Select value={emergencyUses} onValueChange={setEmergencyUses}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 emergency use</SelectItem>
                      <SelectItem value="2">2 emergency uses</SelectItem>
                      <SelectItem value="3">3 emergency uses</SelectItem>
                      <SelectItem value="5">5 emergency uses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="w-5 h-5 text-primary" />
                Supported Categories
              </CardTitle>
              <p className="text-sm text-muted-foreground">Select which expense categories this budget should cover</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-32 sm:max-h-48 overflow-y-auto border rounded-md p-3">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label htmlFor={category} className="text-sm font-normal cursor-pointer flex-1">
                        {category}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No categories found matching "{searchTerm}"</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Add custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCategory())}
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={addCustomCategory} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {selectedCategories.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-sm font-medium">Selected Categories ({selectedCategories.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((category) => (
                      <Badge key={category} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                        {category}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
                          onClick={() => removeCategory(category)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {errors.categories && (
                <p className="text-sm text-destructive">{errors.categories}</p>
              )}
            </CardContent>
            </Card>
          </div>

          <DialogFooter className="mt-4 flex flex-row gap-2 border-t bg-background pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!amount || !budgetName || selectedCategories.length === 0}
              className="flex-1"
            >
              {editingBudget ? "Update Budget" : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
