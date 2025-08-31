"use client"

import type React from "react"
import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TrendingUp, TrendingDown, Clock, CheckCircle, Target, Wallet, Plus, Info, AlertCircle } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCurrencySymbol } from "@/lib/currency"
import { getDefaultCategoryNames, AVAILABLE_ICONS } from "@/lib/categories"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAccessibility } from "@/hooks/use-accessibility"

interface FormData {
  amount: string
  category: string
  subcategory: string
  description: string
  allocationType: "direct" | "goal"
  allocationTarget: string
}

interface UnifiedTransactionDialogProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

interface FieldState {
  touched: boolean
  blurred: boolean
}

const initialFormData: FormData = {
  amount: "",
  category: "",
  subcategory: "",
  description: "",
  allocationType: "direct",
  allocationTarget: "",
}

export function UnifiedTransactionDialog({ isOpen = false, onOpenChange }: UnifiedTransactionDialogProps = {}) {
  const { addTransaction, userProfile, calculateTimeEquivalent, goals, settings, categories, addCategory } =
    useWalletData()
  const { playSound } = useAccessibility()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isOpen !== undefined ? isOpen : internalOpen

  const [type, setType] = useState<"income" | "expense">("expense")
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [fieldStates, setFieldStates] = useState<Record<keyof FormData, FieldState>>({
    amount: { touched: false, blurred: false },
    category: { touched: false, blurred: false },
    subcategory: { touched: false, blurred: false },
    description: { touched: false, blurred: false },
    allocationType: { touched: false, blurred: false },
    allocationTarget: { touched: false, blurred: false },
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦")
  const amountInputRef = useRef<HTMLInputElement>(null)

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency)
  }, [userProfile?.currency, (userProfile as any)?.customCurrency])

  const numAmount = useMemo(() => {
    const parsed = Number.parseFloat(formData.amount)
    return isNaN(parsed) ? 0 : parsed
  }, [formData.amount])

  const timeEquivalentBreakdown = useMemo(() => {
    if (!numAmount || !userProfile) return null
    const { getTimeEquivalentBreakdown } = require("@/lib/wallet-utils")
    return getTimeEquivalentBreakdown(numAmount, userProfile)
  }, [numAmount, userProfile])

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
    const contextCategories = categories
      .filter((cat) => cat.type === type)
      .map((cat) => cat.name)

    // If no categories in context, use default categories
    if (contextCategories.length === 0) {
      return getDefaultCategoryNames(type)
    }

    return contextCategories.sort()
  }, [categories, type])

  // Validation logic - only show errors when appropriate
  const getFieldError = useCallback((field: keyof FormData): string | undefined => {
    const fieldState = fieldStates[field]
    const shouldShowError = submitAttempted || (fieldState.touched && fieldState.blurred)

    if (!shouldShowError) return undefined

    switch (field) {
      case 'amount':
        if (!formData.amount) return "Amount is required"
        if (numAmount <= 0) return "Amount must be greater than 0"
        break
      case 'category':
        if (!formData.category) return "Category is required"
        break
      case 'description':
        if (!formData.description.trim()) return "Description is required"
        break
      case 'allocationTarget':
        if (formData.allocationType !== "direct" && !formData.allocationTarget) {
          return `Please select a ${formData.allocationType}`
        }
        break
    }
    return undefined
  }, [formData, numAmount, fieldStates, submitAttempted])

  const errors = useMemo(() => {
    const errorObj: Record<string, string> = {}
    Object.keys(formData).forEach(field => {
      const error = getFieldError(field as keyof FormData)
      if (error) errorObj[field] = error
    })
    return errorObj
  }, [formData, getFieldError])

  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0 &&
           formData.amount &&
           numAmount > 0 &&
           (formData.allocationType === "goal" || formData.category) &&
           formData.description.trim() &&
           (formData.allocationType === "direct" || formData.allocationTarget)
  }, [errors, formData, numAmount])

  // Focus management
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        amountInputRef.current?.focus()
      }, 150)

      // Load persisted form data
      const persisted = localStorage.getItem("transaction-dialog-form")
      if (persisted) {
        try {
          const parsed = JSON.parse(persisted)
          setFormData({ ...initialFormData, ...parsed })
        } catch (error) {
          // Ignore invalid data
        }
      }
    } else {
      localStorage.removeItem("transaction-dialog-form")
    }
  }, [open])

  // Persist form data
  useEffect(() => {
    if (open && (formData.amount !== "" || formData.category !== "" || formData.description !== "")) {
      localStorage.setItem("transaction-dialog-form", JSON.stringify(formData))
    }
  }, [formData, open])

  const handleFieldChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))

      // Mark field as touched
      setFieldStates(prev => ({
        ...prev,
        [field]: { ...prev[field], touched: true }
      }))
    },
    [],
  )

  const handleFieldBlur = useCallback((field: keyof FormData) => {
    setFieldStates(prev => ({
      ...prev,
      [field]: { ...prev[field], blurred: true }
    }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setFieldStates({
      amount: { touched: false, blurred: false },
      category: { touched: false, blurred: false },
      subcategory: { touched: false, blurred: false },
      description: { touched: false, blurred: false },
      allocationType: { touched: false, blurred: false },
      allocationTarget: { touched: false, blurred: false },
    })
    setSubmitAttempted(false)
    setType("expense")
    setShowAddCategory(false)
    setNewCategoryName("")
    setNewCategoryIcon("📦")
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
      setSubmitAttempted(true)

      if (!isFormValid) {
        // Focus first error field
        const firstErrorField = Object.keys(errors)[0]
        if (firstErrorField === 'amount') {
          amountInputRef.current?.focus()
        }
        return
      }

      setIsSubmitting(true)

      try {
        const result = await addTransaction({
          type,
          amount: numAmount,
          category: formData.allocationType === "goal" ? "Goal Contribution" : formData.category,
          subcategory: formData.subcategory || undefined,
          description: formData.description || `${type === "income" ? "Income" : "Expense"} - ${formData.allocationType === "goal" ? "Goal Contribution" : formData.category}`,
          date: new Date().toISOString(),
          allocationType: formData.allocationType,
          allocationTarget: formData.allocationTarget || undefined,
        })

        if (result.budgetWarnings && result.budgetWarnings.length > 0) {
          result.budgetWarnings.forEach((warning: any) => {
            toast.warning(warning.message, {
              description: warning.details || "Please review your budget allocation."
            })
          })
        }

        toast.success(`${type === "income" ? "Income" : "Expense"} added successfully!`, {
          description: `${currencySymbol}${numAmount} added to ${formData.category}`,
          duration: 3000,
        })

        playSound("transaction-success")

        setTimeout(() => {
          resetForm()
          handleOpenChange(false)
        }, 1000)
      } catch (error) {
        toast.error("Failed to add transaction", {
          description: error instanceof Error ? error.message : "Please try again."
        })
        playSound("transaction-failed")
      } finally {
        setIsSubmitting(false)
      }
    },
    [isFormValid, errors, addTransaction, type, numAmount, formData, resetForm, handleOpenChange, currencySymbol],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === "Escape" && !isSubmitting) {
        handleOpenChange(false)
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        if (isFormValid && !isSubmitting) {
          handleSubmit(e as any)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, isSubmitting, isFormValid, handleOpenChange, handleSubmit])

  const handleTypeChange = useCallback((newType: string) => {
    const t = newType as "income" | "expense"
    setType(t)
    setFormData((prev) => ({
      ...prev,
      category: "",
      subcategory: "",
      allocationType: "direct",
      allocationTarget: ""
    }))
    setFieldStates(prev => ({
      ...prev,
      category: { touched: false, blurred: false },
      subcategory: { touched: false, blurred: false },
      allocationType: { touched: false, blurred: false },
      allocationTarget: { touched: false, blurred: false },
    }))
    setShowAddCategory(false)
  }, [])

  const handleAllocationTypeChange = useCallback((newAllocationType: "direct" | "goal") => {
    setFormData((prev) => ({
      ...prev,
      allocationType: newAllocationType,
      allocationTarget: newAllocationType === "direct" ? "" : prev.allocationTarget,
      category: newAllocationType === "goal" ? "" : prev.category,
      subcategory: newAllocationType === "goal" ? "" : prev.subcategory,
    }))
    setFieldStates(prev => ({
      ...prev,
      allocationType: { touched: true, blurred: false },
      allocationTarget: { touched: false, blurred: false },
      category: { touched: false, blurred: false },
      subcategory: { touched: false, blurred: false },
    }))
  }, [])

  const handleAddNewCategory = useCallback(() => {
    if (!newCategoryName.trim() || !addCategory) return

    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase() && c.type === type,
    )

    if (exists) {
      toast.error("Category already exists", {
        description: `A ${type} category with this name already exists.`
      })
      return
    }

    const newCategory = addCategory({
      name: newCategoryName.trim(),
      type: type,
      color: "#3b82f6",
      icon: newCategoryIcon,
      isDefault: false,
    })

    setFormData((prev) => ({ ...prev, category: newCategory.name }))
    setFieldStates(prev => ({
      ...prev,
      category: { touched: true, blurred: false }
    }))
    setNewCategoryName("")
    setNewCategoryIcon("📦")
    setShowAddCategory(false)

    toast.success("Category added!", {
      description: `${newCategory.name} has been added to your ${type} categories.`
    })
  }, [newCategoryName, addCategory, categories, type])

  // Smart placeholder text
  const getDescriptionPlaceholder = useCallback(() => {
    if (!formData.category) {
      return type === "income"
        ? "e.g., Monthly salary, Freelance work, Gift received..."
        : "e.g., Grocery shopping, Rent payment, Gas bill..."
    }

    return type === "income"
      ? `e.g., ${formData.category} payment, Monthly ${formData.category.toLowerCase()}...`
      : `e.g., ${formData.category} purchase, ${formData.category.toLowerCase()} expense...`
  }, [formData.category, type])

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                type === "income" ? "bg-green-100 dark:bg-green-900/20" : "bg-blue-100 dark:bg-blue-900/20"
              )}>
                <span className={cn(
                  "text-lg font-bold",
                  type === "income" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"
                )}>
                  {currencySymbol}
                </span>
              </div>
              Add New Transaction
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type Tabs */}
            <Tabs value={type} onValueChange={handleTypeChange}>
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger
                  value="income"
                  className="flex items-center gap-2 h-10 data-[state=active]:bg-green-100 data-[state=active]:text-green-700 dark:data-[state=active]:bg-green-900/20 dark:data-[state=active]:text-green-400"
                >
                  <TrendingUp className="w-4 h-4" />
                  Income
                </TabsTrigger>
                <TabsTrigger
                  value="expense"
                  className="flex items-center gap-2 h-10 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-400"
                >
                  <TrendingDown className="w-4 h-4" />
                  Expense
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-5">
              {/* Amount Field */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-1">
                  Amount
                  <span className="text-orange-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                    {currencySymbol}
                  </span>
                  <Input
                    ref={amountInputRef}
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleFieldChange("amount", e.target.value)}
                    onBlur={() => handleFieldBlur("amount")}
                    placeholder="0.00"
                    className={cn(
                      "text-lg font-medium transition-all duration-200 pl-10",
                      errors.amount ? "border-red-300 focus:border-red-500 bg-red-50/50 dark:bg-red-900/10" :
                      numAmount > 0 ? "border-green-300 focus:border-green-500 bg-green-50/50 dark:bg-green-900/10" : ""
                    )}
                    disabled={isSubmitting}
                    aria-describedby={errors.amount ? "amount-error" : "amount-help"}
                  />
                  {numAmount > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
                {errors.amount ? (
                  <p id="amount-error" className="text-sm text-red-600 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3 h-3" />
                    {errors.amount}
                  </p>
                ) : (
                  <p id="amount-help" className="text-xs text-muted-foreground">
                    Enter the transaction amount in {currencySymbol}
                  </p>
                )}

                {/* Time Equivalent Display */}
                {numAmount > 0 && timeEquivalentBreakdown && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium text-primary text-sm">Time Equivalent</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 cursor-help text-primary/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Based on your hourly rate, this shows how much work time this amount represents.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      {timeEquivalentBreakdown.formatted.userFriendly}
                    </p>
                    <p className="text-xs text-primary/70 mt-1">
                      {type === "expense"
                        ? "Time you worked to earn this money"
                        : "Value of your time investment"}
                    </p>
                  </div>
                )}
              </div>

              {/* Allocation Type for Expenses */}
              {type === "expense" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Allocation Method</Label>
                  <RadioGroup
                    value={formData.allocationType}
                    onValueChange={handleAllocationTypeChange}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2 p-2 rounded-lg border border-border/50 hover:border-border transition-colors flex-1">
                      <RadioGroupItem value="direct" id="direct" />
                      <div className="flex-1">
                        <Label htmlFor="direct" className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                          <Wallet className="w-4 h-4 text-blue-500" />
                          Direct Expense
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-2 rounded-lg border border-border/50 hover:border-border transition-colors flex-1">
                      <RadioGroupItem value="goal" id="goal" />
                      <div className="flex-1">
                        <Label htmlFor="goal" className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                          <Target className="w-4 h-4 text-purple-500" />
                          Spend for Goal
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Goal Selection */}
              {formData.allocationType === "goal" && (
                <div className="space-y-2">
                  <Label htmlFor="allocationTarget" className="text-sm font-medium flex items-center gap-1">
                    Select Goal
                    <span className="text-orange-500">*</span>
                  </Label>
                  <Select
                    value={formData.allocationTarget}
                    onValueChange={(value) => handleFieldChange("allocationTarget", value)}
                    onOpenChange={(open) => !open && handleFieldBlur("allocationTarget")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      className={cn(
                        "transition-all duration-200",
                        errors.allocationTarget ? "border-red-300 focus:border-red-500" : ""
                      )}
                      aria-describedby={errors.allocationTarget ? "allocationTarget-error" : undefined}
                    >
                      <SelectValue placeholder="Choose a goal to contribute to" />
                    </SelectTrigger>
                    <SelectContent>
                      {allocationTargets.map((target) => (
                        <SelectItem key={target.id} value={target.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium">{target.title}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {currencySymbol}{target.currentAmount} / {currencySymbol}{target.targetAmount}
                              </span>
                              <span>•</span>
                              <span className="text-primary">
                                {Math.round((target.currentAmount / target.targetAmount) * 100)}% complete
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                      {allocationTargets.length === 0 && (
                        <SelectItem value="none" disabled>
                          No incomplete goals available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.allocationTarget && (
                    <p id="allocationTarget-error" className="text-sm text-red-600 flex items-center gap-1" role="alert">
                      <AlertCircle className="w-3 h-3" />
                      {errors.allocationTarget}
                    </p>
                  )}

                  {formData.allocationTarget && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Goal contribution confirmed
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {currencySymbol}{numAmount} will be added to your goal progress and deducted from your main balance.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Category Selection - Only show for direct expenses */}
              {formData.allocationType === "direct" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category" className="text-sm font-medium flex items-center gap-1">
                      Category
                      <span className="text-orange-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-xs h-7 px-2 text-primary hover:text-primary"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add New
                    </Button>
                  </div>

                  {showAddCategory && (
                    <div className="mb-3 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex gap-2">
                        <Input
                          placeholder={`New ${type} category name`}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1"
                          onKeyPress={(e) => e.key === "Enter" && handleAddNewCategory()}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddNewCategory}
                          disabled={!newCategoryName.trim()}
                          className="px-3"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddCategory(false)
                            setNewCategoryName("")
                          }}
                          className="px-3"
                        >
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
                    onOpenChange={(open) => !open && handleFieldBlur("category")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      className={cn(
                        "transition-all duration-200",
                        errors.category ? "border-red-300 focus:border-red-500" :
                        formData.category ? "border-green-300 focus:border-green-500" : ""
                      )}
                      aria-describedby={errors.category ? "category-error" : undefined}
                    >
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((categoryName) => {
                        const categoryData = categories.find((c) => c.name === categoryName && c.type === type)
                        return (
                          <SelectItem key={categoryName} value={categoryName}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: categoryData?.color || "#3b82f6" }}
                              />
                              <span>{categoryName}</span>
                              {!categoryData?.isDefault && (
                                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                      {availableCategories.length === 0 && (
                        <SelectItem value="none" disabled>
                          No {type} categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p id="category-error" className="text-sm text-red-600 flex items-center gap-1" role="alert">
                      <AlertCircle className="w-3 h-3" />
                      {errors.category}
                    </p>
                  )}
                </div>
              )}

              {/* Subcategory (if available and category is selected) */}
              {formData.allocationType === "direct" && subcategoryOptions.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="subcategory" className="text-sm font-medium text-muted-foreground">
                    Subcategory (Optional)
                  </Label>
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) => handleFieldChange("subcategory", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategoryOptions.map((subcat: string) => (
                        <SelectItem key={subcat} value={subcat}>
                          {subcat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1">
                  Description
                  <span className="text-orange-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  onBlur={() => handleFieldBlur("description")}
                  placeholder={getDescriptionPlaceholder()}
                  rows={2}
                  className={cn(
                    "resize-none transition-all duration-200",
                    errors.description ? "border-red-300 focus:border-red-500" :
                    formData.description.trim() ? "border-green-300 focus:border-green-500" : ""
                  )}
                  disabled={isSubmitting}
                  aria-describedby={errors.description ? "description-error" : "description-help"}
                />
                {errors.description ? (
                  <p id="description-error" className="text-sm text-red-600 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3 h-3" />
                    {errors.description}
                  </p>
                ) : (
                  <p id="description-help" className="text-xs text-muted-foreground">
                    Add a note to help you remember this transaction later
                  </p>
                )}
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(
                  "flex-1 transition-colors duration-200",
                  type === "income"
                    ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:ring-green-500"
                    : "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500"
                )}
                disabled={isSubmitting || !isFormValid}
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
    </TooltipProvider>
  )
}