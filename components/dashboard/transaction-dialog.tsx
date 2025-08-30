"use client"

import type React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle, Target, Wallet, Plus } from "lucide-react"
import { useWalletData } from "@/hooks/use-wallet-data"

interface FormData {
  amount: string
  category: string
  subcategory: string
  description: string
  date: string
  allocationType: "direct" | "goal"
  allocationTarget: string
}

interface UnifiedTransactionDialogProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const initialFormData: FormData = {
  amount: "",
  category: "",
  subcategory: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  allocationType: "direct",
  allocationTarget: "",
}

export function UnifiedTransactionDialog({ isOpen = false, onOpenChange }: UnifiedTransactionDialogProps = {}) {
  const { addTransaction, userProfile, calculateTimeEquivalent, goals, settings, categories, addCategory } =
    useWalletData()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isOpen !== undefined ? isOpen : internalOpen

  const [type, setType] = useState<"income" | "expense">("expense")
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const currencySymbol = useMemo(() => userProfile?.currency?.symbol || "$", [userProfile?.currency?.symbol])

  const numAmount = useMemo(() => {
    const parsed = Number.parseFloat(formData.amount)
    return isNaN(parsed) ? 0 : parsed
  }, [formData.amount])

  const timeEquivalent = useMemo(() => {
    return numAmount > 0 && userProfile ? calculateTimeEquivalent(numAmount) : 0
  }, [numAmount, userProfile, calculateTimeEquivalent])

  const subcategoryOptions = useMemo(() => {
    if (!formData.category || !settings?.customBudgetCategories) return []
    return settings.customBudgetCategories[formData.category] || []
  }, [formData.category, settings?.customBudgetCategories])

  const allocationTargets = useMemo(() => {
    if (formData.allocationType === "goal") {
      return goals?.filter((g) => g.currentAmount < g.targetAmount) || []
    }
    return []
  }, [formData.allocationType, goals])

  const availableCategories = useMemo(() => {
    return categories
      .filter((cat) => cat.type === type)
      .map((cat) => cat.name)
      .sort()
  }, [categories, type])

  const validateForm = useCallback((): boolean => {
    console.log("[v0] Validating form with data:", formData)
    const newErrors: Partial<FormData> = {}

    if (!formData.amount || numAmount <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0"
      console.log("[v0] Amount validation failed:", formData.amount, numAmount)
    }

    if (!formData.category) {
      newErrors.category = "Please select a category"
    }

    if (!formData.date) {
      newErrors.date = "Please select a date"
    }

    if (formData.allocationType !== "direct" && !formData.allocationTarget) {
      newErrors.allocationTarget = `Please select a ${formData.allocationType}`
    }

    const selectedDate = new Date(formData.date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (selectedDate > today) {
      newErrors.date = "Date cannot be in the future"
    }
    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    return isValid
  }, [formData, numAmount])

  useEffect(() => {
    if (isOpen !== undefined) {
    }
  }, [isOpen])

  useEffect(() => {
    if (open) {
      validateForm()
    }
  }, [formData, open])

  const handleFieldChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors],
  )

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setErrors({})
    setType("expense")
    setShowAddCategory(false)
    setNewCategoryName("")
  }, [])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && !isSubmitting) {
        resetForm()
      }

      if (onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    },
    [isSubmitting, resetForm, onOpenChange],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!validateForm()) {
        return
      }
      setIsSubmitting(true)

      try {
        console.log("[v0] Calling addTransaction with:", {
          type,
          amount: numAmount,
          category: formData.category,
          subcategory: formData.subcategory || undefined,
          description: formData.description || `${type === "income" ? "Income" : "Expense"} - ${formData.category}`,
          date: new Date(formData.date).toISOString(),
          allocationType: formData.allocationType,
          allocationTarget: formData.allocationTarget || undefined,
        })

        const result = await addTransaction({
          type,
          amount: numAmount,
          category: formData.category,
          subcategory: formData.subcategory || undefined,
          description: formData.description || `${type === "income" ? "Income" : "Expense"} - ${formData.category}`,
          date: new Date(formData.date).toISOString(),
          allocationType: formData.allocationType,
          allocationTarget: formData.allocationTarget || undefined,
        })

        if (result.budgetWarnings && result.budgetWarnings.length > 0) {
          // You could show these warnings to the user here
        }

        resetForm()
        handleOpenChange(false)
      } catch (error) {
        setErrors({ amount: error instanceof Error ? error.message : "Failed to add transaction" })
      } finally {
        setIsSubmitting(false)
      }
    },
    [validateForm, addTransaction, type, numAmount, formData, resetForm, handleOpenChange],
  )

  const handleTypeChange = useCallback((newType: "income" | "expense") => {
    setType(newType)
    setFormData((prev) => ({ ...prev, category: "", subcategory: "" }))
    setErrors((prev) => ({ ...prev, category: undefined, subcategory: undefined }))
    setShowAddCategory(false)
  }, [])

  const handleAddNewCategory = useCallback(() => {
    if (!newCategoryName.trim() || !addCategory) return

    // Check if category already exists
    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase() && c.type === type,
    )

    if (exists) {
      alert("A category with this name already exists for this type")
      return
    }

    const newCategory = addCategory({
      name: newCategoryName.trim(),
      type: type,
      color: "#3b82f6",
      isDefault: false,
    })

    // Select the newly created category
    setFormData((prev) => ({ ...prev, category: newCategory.name }))
    setNewCategoryName("")
    setShowAddCategory(false)
  }, [newCategoryName, addCategory, categories, type])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Add New Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={type} onValueChange={handleTypeChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="income"
                className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
              >
                <TrendingUp className="w-4 h-4" />
                Income
              </TabsTrigger>
              <TabsTrigger
                value="expense"
                className="flex items-center gap-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-700"
              >
                <TrendingDown className="w-4 h-4" />
                Expense
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
            <div>
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount ({currencySymbol}) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleFieldChange("amount", e.target.value)}
                placeholder="0.00"
                className={errors.amount ? "border-red-300 focus:border-red-500" : ""}
                disabled={isSubmitting}
              />
              {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
              {numAmount > 0 && timeEquivalent > 0 && (
                <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Time Equivalent:</span>
                    {timeEquivalent >= 60
                      ? `${Math.floor(timeEquivalent / 60)}h ${timeEquivalent % 60}m`
                      : `${timeEquivalent}m`}{" "}
                    of work
                  </p>
                  <p className="text-xs text-primary/80 mt-1">
                    {type === "expense"
                      ? "This expense represents the time you worked to earn this money"
                      : "This income represents the value of your time invested"}
                  </p>
                </div>
              )}
            </div>

            {type === "expense" && (
              <div>
                <Label className="text-sm font-medium">How do you want to allocate this expense?</Label>
                <RadioGroup
                  value={formData.allocationType}
                  onValueChange={(value) => handleFieldChange("allocationType", value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direct" id="direct" />
                    <Label htmlFor="direct" className="flex items-center gap-2 cursor-pointer">
                      <Wallet className="w-4 h-4" />
                      Direct Expense
                      <span className="text-xs text-muted-foreground ml-2">(Deducted from main balance)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="goal" id="goal" />
                    <Label htmlFor="goal" className="flex items-center gap-2 cursor-pointer">
                      <Target className="w-4 h-4" />
                      Expense towards Goal
                      <span className="text-xs text-muted-foreground ml-2">(Progress towards your goal)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {formData.allocationType === "goal" && (
              <div>
                <Label htmlFor="allocationTarget" className="text-sm font-medium">
                  Select Goal <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.allocationTarget}
                  onValueChange={(value) => handleFieldChange("allocationTarget", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.allocationTarget ? "border-red-300 focus:border-red-500" : ""}>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {allocationTargets.map((target) => (
                      <SelectItem key={target.id} value={target.id}>
                        <div className="flex flex-col">
                          <span>{target.title}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {currencySymbol}
                              {target.currentAmount}/{currencySymbol}
                              {target.targetAmount}
                            </span>
                            <span>•</span>
                            <span>{Math.round((target.currentAmount / target.targetAmount) * 100)}% complete</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.allocationTarget && <p className="text-sm text-red-600 mt-1">{errors.allocationTarget}</p>}

                {formData.allocationTarget && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      This expense will be added to your goal progress and deducted from your main balance.
                    </p>
                    {numAmount > 0 && timeEquivalent > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        You're investing{" "}
                        {timeEquivalent >= 60
                          ? `${Math.floor(timeEquivalent / 60)}h ${timeEquivalent % 60}m`
                          : `${timeEquivalent}m`}{" "}
                        of work time towards this goal.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="text-xs h-6 px-2"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add New
                </Button>
              </div>

              {showAddCategory && (
                <div className="mb-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`New ${type} category name`}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => e.key === "Enter" && handleAddNewCategory()}
                    />
                    <Button type="button" size="sm" onClick={handleAddNewCategory} disabled={!newCategoryName.trim()}>
                      Add
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowAddCategory(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Select
                value={formData.category}
                onValueChange={(value) => {
                  handleFieldChange("category", value)
                  handleFieldChange("subcategory", "")
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className={errors.category ? "border-red-300 focus:border-red-500" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((categoryName) => {
                    const categoryData = categories.find((c) => c.name === categoryName && c.type === type)
                    return (
                      <SelectItem key={categoryName} value={categoryName}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: categoryData?.color || "#3b82f6" }}
                          />
                          <span>{categoryName}</span>
                          {!categoryData?.isDefault && <span className="text-xs text-muted-foreground">(Custom)</span>}
                        </div>
                      </SelectItem>
                    )
                  })}
                  {availableCategories.length === 0 && (
                    <SelectItem value="" disabled>
                      No {type} categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
            </div>

            {subcategoryOptions.length > 0 && (
              <div>
                <Label htmlFor="subcategory" className="text-sm font-medium">
                  Subcategory (Optional)
                </Label>
                <Select
                  value={formData.subcategory}
                  onValueChange={(value) => handleFieldChange("subcategory", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategoryOptions.map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>
                        {subcat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-primary">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                placeholder="e.g., 'Monthly salary', 'Paid school fees', 'Grocery shopping'..."
                rows={2}
                className="resize-none"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Add a note to help you remember this transaction later
              </p>
            </div>

            <div>
              <Label htmlFor="date" className="text-sm font-medium">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleFieldChange("date", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className={errors.date ? "border-red-300 focus:border-red-500" : ""}
                disabled={isSubmitting}
              />
              {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                console.log("[v0] Cancel button clicked")
                handleOpenChange(false)
              }}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`flex-1 transition-colors duration-200 ${
                type === "income"
                  ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:ring-green-500"
                  : "bg-destructive hover:bg-destructive/90 focus:ring-destructive"
              }`}
              disabled={isSubmitting || Object.keys(errors).length > 0}
              onClick={() => {}}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </div>
              ) : (
                `Add ${type === "income" ? "Income" : "Expense"}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
