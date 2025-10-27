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
import { TrendingUp, TrendingDown, Clock, CheckCircle, Target, Wallet, Plus, Info, AlertCircle, Receipt, X } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCurrencySymbol, getLocaleForCurrency } from "@/lib/currency"
import { getDefaultCategoryNames, AVAILABLE_ICONS } from "@/lib/categories"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAccessibility } from "@/hooks/use-accessibility"

interface FormData {
   amount: string
   category: string
   subcategory: string
   description: string
   allocationType: "direct" | "goal" | "debt" | "credit"
   allocationTarget: string
   receiptImage?: string
 }

interface DebtFormData {
  name: string
  minimumPayment: string
  interestRate: string
  startDate: string
}

interface UnifiedTransactionDialogProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  initialAmount?: string
  initialDescription?: string
  initialType?: "income" | "expense"
  initialCategory?: string
  initialReceiptImage?: string
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

export function UnifiedTransactionDialog({ isOpen = false, onOpenChange, initialAmount, initialDescription, initialType, initialCategory, initialReceiptImage }: UnifiedTransactionDialogProps = {}) {
  const { addTransaction, userProfile, calculateTimeEquivalent, goals, settings, categories, addCategory, addDebtAccount, addDebtToAccount, debtAccounts, creditAccounts, balance, completeTransactionWithDebt, addDebtToAccount: addDebtCharge, updateCreditBalance, makeDebtPayment } =
    useWalletData()
  const { playSound } = useAccessibility()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isOpen !== undefined ? isOpen : internalOpen

  const [type, setType] = useState<"income" | "expense">(initialType || "expense")
  const [formData, setFormData] = useState<FormData>(() => ({
    ...initialFormData,
    amount: initialAmount || "",
    description: initialDescription || "",
    category: initialCategory || "",
    receiptImage: initialReceiptImage || ""
  }))
  const [displayAmount, setDisplayAmount] = useState("")
  const [fieldStates, setFieldStates] = useState<Record<keyof FormData, FieldState>>({
    amount: { touched: !!initialAmount, blurred: false },
    category: { touched: !!initialCategory, blurred: false },
    subcategory: { touched: false, blurred: false },
    description: { touched: !!initialDescription, blurred: false },
    allocationType: { touched: false, blurred: false },
    allocationTarget: { touched: false, blurred: false },
    receiptImage: { touched: !!initialReceiptImage, blurred: false },
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
   const [submitAttempted, setSubmitAttempted] = useState(false)
   const [showAddCategory, setShowAddCategory] = useState(false)
   const [newCategoryName, setNewCategoryName] = useState("")
   const [newCategoryIcon, setNewCategoryIcon] = useState("📦")
   const [showDebtDialog, setShowDebtDialog] = useState(false)
   const [debtFormData, setDebtFormData] = useState<DebtFormData>({
     name: "",
     minimumPayment: "",
     interestRate: "",
     startDate: new Date().toISOString().split('T')[0]
   })
   const [pendingTransactionResult, setPendingTransactionResult] = useState<any>(null)
   const [pendingTransaction, setPendingTransaction] = useState<any>(null)
   const [showDebtMoreOptions, setShowDebtMoreOptions] = useState(false)
   const amountInputRef = useRef<HTMLInputElement>(null)

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency)
  }, [userProfile?.currency, (userProfile as any)?.customCurrency])

  const [numberFormat, setNumberFormat] = useState(() => {
    return localStorage.getItem("wallet_number_format") || "us"
  })

  // Listen for number format changes
  useEffect(() => {
    const updateFormat = () => {
      const newFormat = localStorage.getItem("wallet_number_format") || "us"
      setNumberFormat(newFormat)
      // Force re-render of displayAmount when format changes
      if (formData.amount) {
        setDisplayAmount(parseFloat(formData.amount).toLocaleString(newFormat === 'us' ? 'en-US' : newFormat === 'eu' ? 'de-DE' : 'en-IN'))
      }
    }

    // Listen for storage changes
    window.addEventListener('storage', updateFormat)

    // Listen for custom events
    window.addEventListener('numberFormatChange', updateFormat)

    // Initial check
    updateFormat()

    return () => {
      window.removeEventListener('storage', updateFormat)
      window.removeEventListener('numberFormatChange', updateFormat)
    }
  }, [formData.amount])

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

  const availableGoals = useMemo(() => {
    return goals?.filter((g) => g.currentAmount < g.targetAmount) || []
  }, [goals])

  const hasAllocationOptions = useMemo(() => {
    return availableGoals.length > 0 || (debtAccounts?.length || 0) > 0 || (creditAccounts?.length || 0) > 0
  }, [availableGoals, debtAccounts, creditAccounts])

  const allocationTargets = useMemo(() => {
    if (formData.allocationType === "goal") {
      return availableGoals
    }
    if (formData.allocationType === "debt") {
      return debtAccounts || []
    }
    if (formData.allocationType === "credit") {
      return creditAccounts || []
    }
    return []
  }, [formData.allocationType, availableGoals, debtAccounts, creditAccounts])

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
        // Description is now optional
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
            ((formData.allocationType === "direct" && formData.category) ||
             (formData.allocationType === "goal" && formData.allocationTarget) ||
             (formData.allocationType === "debt" && formData.allocationTarget) ||
             (formData.allocationType === "credit" && formData.allocationTarget))
  }, [errors, formData, numAmount])

  // Focus management
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        amountInputRef.current?.focus()
      }, 150)

      // Load persisted form data only if no initial data provided
      if (!initialAmount && !initialDescription && !initialType && !initialCategory && !initialReceiptImage) {
        const persisted = localStorage.getItem("transaction-dialog-form")
        if (persisted) {
          try {
            const parsed = JSON.parse(persisted)
            setFormData({ ...initialFormData, ...parsed })
          } catch (error) {
            // Ignore invalid data
          }
        }
      }
    } else {
      localStorage.removeItem("transaction-dialog-form")
    }
  }, [open, initialAmount, initialDescription, initialType, initialCategory])

  // Update form data when initial props change
  useEffect(() => {
    if (initialAmount || initialDescription || initialType || initialCategory || initialReceiptImage) {
      setFormData(prev => ({
        ...prev,
        amount: initialAmount || prev.amount,
        description: initialDescription || prev.description,
        category: initialCategory || prev.category,
        receiptImage: initialReceiptImage || prev.receiptImage
      }))
      setDisplayAmount(initialAmount ? parseFloat(initialAmount).toLocaleString(numberFormat === 'us' ? 'en-US' : numberFormat === 'eu' ? 'de-DE' : 'en-IN') : "")
      setFieldStates(prev => ({
        ...prev,
        amount: initialAmount ? { touched: true, blurred: false } : prev.amount,
        description: initialDescription ? { touched: true, blurred: false } : prev.description,
        category: initialCategory ? { touched: true, blurred: false } : prev.category,
        receiptImage: initialReceiptImage ? { touched: true, blurred: false } : prev.receiptImage
      }))
      if (initialType) {
        setType(initialType)
      }
    }
  }, [initialAmount, initialDescription, initialType, initialCategory, initialReceiptImage, numberFormat])

  // Persist form data
  useEffect(() => {
    if (open && (formData.amount !== "" || formData.category !== "" || formData.description !== "")) {
      localStorage.setItem("transaction-dialog-form", JSON.stringify(formData))
    }
  }, [formData, open])

  const handleFieldChange = useCallback(
    (field: keyof FormData, value: string) => {
      if (field === "amount") {
        const rawValue = value.replace(/,/g, '')
        if (/^\d*\.?\d*$/.test(rawValue) || rawValue === '') {
          setFormData((prev) => ({ ...prev, [field]: rawValue }))
          setDisplayAmount(rawValue ? parseFloat(rawValue).toLocaleString(numberFormat === 'us' ? 'en-US' : numberFormat === 'eu' ? 'de-DE' : 'en-IN') : "")
        }
      } else {
        setFormData((prev) => ({ ...prev, [field]: value }))
      }

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
    setFormData({
      ...initialFormData,
      amount: initialAmount || "",
      description: initialDescription || "",
      category: initialCategory || "",
      receiptImage: initialReceiptImage || ""
    })
    setDisplayAmount(initialAmount ? parseFloat(initialAmount).toLocaleString(numberFormat === 'us' ? 'en-US' : numberFormat === 'eu' ? 'de-DE' : 'en-IN') : "")
    setFieldStates({
      amount: { touched: !!initialAmount, blurred: false },
      category: { touched: !!initialCategory, blurred: false },
      subcategory: { touched: false, blurred: false },
      description: { touched: !!initialDescription, blurred: false },
      allocationType: { touched: false, blurred: false },
      allocationTarget: { touched: false, blurred: false },
      receiptImage: { touched: !!initialReceiptImage, blurred: false },
    })
    setSubmitAttempted(false)
    setType(initialType || "expense")
    setShowAddCategory(false)
    setNewCategoryName("")
    setNewCategoryIcon("📦")
    setShowDebtMoreOptions(false)
    setPendingTransactionResult(null)
    setPendingTransaction(null)
  }, [initialAmount, initialDescription, initialType, initialCategory, numberFormat])

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
        let transactionResult;
        if (formData.allocationType === "debt") {
          // Handle debt repayment allocation
          const debtAccount = debtAccounts.find(d => d.id === formData.allocationTarget);
          if (debtAccount) {
            // Make debt payment (reduce debt balance)
            const paymentResult = await makeDebtPayment(debtAccount.id, numAmount);
            if (!paymentResult.success) {
              setIsSubmitting(false)
              toast.error("Failed to allocate to debt", {
                description: paymentResult.error || "Unable to process debt payment."
              })
              playSound("transaction-failed")
              return
            }
            transactionResult = paymentResult.transaction;
          }
        } else if (formData.allocationType === "credit") {
          const creditAccount = creditAccounts.find(c => c.id === formData.allocationTarget);
          if (creditAccount) {
            await updateCreditBalance(creditAccount.id, creditAccount.balance + numAmount);
            transactionResult = await addTransaction({
              type,
              amount: numAmount,
              category: "Credit Charge",
              subcategory: formData.subcategory || undefined,
              description: formData.description.trim() || `Expense charged to credit: ${creditAccount.name}`,
              date: new Date().toISOString(),
              allocationType: formData.allocationType,
              allocationTarget: formData.allocationTarget || undefined,
              total: numAmount,
              actual: numAmount,
              debtUsed: 0,
              debtAccountId: null,
              status: "normal",
            });
          }
        } else {
          // Handle direct or goal allocation
          transactionResult = await addTransaction({
            type,
            amount: numAmount,
            category: formData.allocationType === "goal" ? "Goal Contribution" : formData.category,
            subcategory: formData.subcategory || undefined,
            description: formData.description.trim() || `${type === "income" ? "Income" : "Expense"} - ${formData.allocationType === "goal" ? "Goal Contribution" : formData.category}`,
            date: new Date().toISOString(),
            allocationType: formData.allocationType,
            allocationTarget: formData.allocationTarget || undefined,
            total: numAmount,
            actual: numAmount,
            debtUsed: 0,
            debtAccountId: null,
            status: "normal",
          });
        }

        if (!transactionResult) {
          setIsSubmitting(false)
          toast.error("Failed to add transaction", {
            description: "Transaction result is undefined. Please try again."
          })
          playSound("transaction-failed")
          return
        }

        const result = transactionResult;

        if (result.needsDebtCreation) {
          // Show debt creation dialog
          setPendingTransactionResult(result)
          setPendingTransaction(result.pendingTransaction)
          setShowDebtDialog(true)
          setIsSubmitting(false)
          return
        }

        if (result.budgetWarnings && result.budgetWarnings.length > 0) {
           result.budgetWarnings.forEach((warning: any) => {
             toast.warning(warning.message, {
               description: warning.details || "Please review your budget allocation."
             })
           })
           // Play budget warning sound
           playSound("budget-warning")
         }

         toast.success(`${type === "income" ? "Income" : "Expense"} added successfully!`, {
           description: formData.allocationType === "goal" ? `${currencySymbol}${numAmount} contributed to goal` :
                       formData.allocationType === "debt" ? `${currencySymbol}${numAmount} applied to debt repayment` :
                       formData.allocationType === "credit" ? `${currencySymbol}${numAmount} charged to credit account` :
                       `${currencySymbol}${numAmount} added to ${formData.category}`,
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
      allocationType: t === "income" ? "direct" : "direct", // For income, only direct is allowed
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

  const handleAllocationTypeChange = useCallback((newAllocationType: "direct" | "goal" | "debt" | "credit") => {
    setFormData((prev) => ({
      ...prev,
      allocationType: newAllocationType,
      allocationTarget: newAllocationType === "direct" ? "" : prev.allocationTarget,
      category: (newAllocationType === "goal" || newAllocationType === "debt" || newAllocationType === "credit") ? "" : prev.category,
      subcategory: (newAllocationType === "goal" || newAllocationType === "debt" || newAllocationType === "credit") ? "" : prev.subcategory,
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

  const handleCreateDebt = useCallback(async () => {
    if (!debtFormData.name.trim() || !pendingTransactionResult || !pendingTransaction) return

    try {
      const debtAmount = pendingTransactionResult.debtAmount
      const availableBalance = pendingTransactionResult.availableBalance
      const minimumPayment = debtFormData.minimumPayment ? Number.parseFloat(debtFormData.minimumPayment) : 0
      const interestRate = debtFormData.interestRate ? Number.parseFloat(debtFormData.interestRate) : 0

      const newDebt = addDebtAccount({
        name: debtFormData.name.trim(),
        balance: debtAmount,
        interestRate: interestRate,
        minimumPayment: minimumPayment,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      })
      await completeTransactionWithDebt(
        pendingTransaction,
        debtFormData.name.trim(),
        newDebt.id,
        availableBalance,
        debtAmount
      )

      toast.success("Transaction completed with debt!", {
        description: `${currencySymbol}${availableBalance.toFixed(2)} from balance + ${currencySymbol}${debtAmount.toFixed(2)} as debt`,
        duration: 3000,
      })

      playSound("transaction-success")
      setShowDebtDialog(false)
      setPendingTransactionResult(null)
      setPendingTransaction(null)
      setDebtFormData({
        name: "",
        minimumPayment: "",
        interestRate: "",
        startDate: new Date().toISOString().split('T')[0]
      })

      setTimeout(() => {
        resetForm()
        handleOpenChange(false)
      }, 1000)
    } catch (error) {
      toast.error("Failed to create debt account", {
        description: error instanceof Error ? error.message : "Please try again."
      })
      playSound("transaction-failed")
    }
  }, [debtFormData, pendingTransactionResult, pendingTransaction, addDebtAccount, completeTransactionWithDebt, currencySymbol, playSound, resetForm, handleOpenChange])

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
                  className="flex items-center gap-2 h-10 data-[state=active]:bg-destructive/25 data-[state=active]:text-red-700 dark:data-[state=active]:bg-red-900/20 dark:data-[state=active]:text-red-400"
                >
                  <TrendingDown className="w-4 h-4" />
                  Expense
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-5">
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
                    type="text"
                    value={displayAmount}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, '')
                      if (/^\d*\.?\d*$/.test(rawValue) || rawValue === '') {
                        handleFieldChange("amount", rawValue)
                      }
                    }}
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

              {/* Allocation Type for Expenses - Only show if allocation options are available */}
              {type === "expense" && hasAllocationOptions && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Allocation Method</Label>
                  <RadioGroup
                    value={formData.allocationType}
                    onValueChange={handleAllocationTypeChange}
                    className="flex flex-wrap gap-3"
                  >
                    <div className="flex items-center space-x-2 p-2 rounded-md border border-border/50 hover:border-border transition-colors">
                      <RadioGroupItem value="direct" id="direct" />
                      <Label htmlFor="direct" className="flex items-center gap-1 cursor-pointer text-sm">
                        <Wallet className="w-3 h-3 text-blue-500" />
                        Direct
                      </Label>
                    </div>

                    {availableGoals.length > 0 && (
                      <div className="flex items-center space-x-2 p-2 rounded-md border border-border/50 hover:border-border transition-colors">
                        <RadioGroupItem value="goal" id="goal" />
                        <Label htmlFor="goal" className="flex items-center gap-1 cursor-pointer text-sm">
                          <Target className="w-3 h-3 text-purple-500" />
                          Goal ({availableGoals.length})
                        </Label>
                      </div>
                    )}

                    {(debtAccounts?.length || 0) > 0 && (
                      <div className="flex items-center space-x-2 p-2 rounded-md border border-border/50 hover:border-border transition-colors">
                        <RadioGroupItem value="debt" id="debt" />
                        <Label htmlFor="debt" className="flex items-center gap-1 cursor-pointer text-sm">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          Debt ({debtAccounts?.length || 0})
                        </Label>
                      </div>
                    )}

                    {(creditAccounts?.length || 0) > 0 && (
                      <div className="flex items-center space-x-2 p-2 rounded-md border border-border/50 hover:border-border transition-colors">
                        <RadioGroupItem value="credit" id="credit" />
                        <Label htmlFor="credit" className="flex items-center gap-1 cursor-pointer text-sm">
                          <Receipt className="w-3 h-3 text-green-500" />
                          Credit ({creditAccounts?.length || 0})
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}

              {/* Allocation Target Selection */}
              {(formData.allocationType === "goal" || formData.allocationType === "debt" || formData.allocationType === "credit") && (
                <div className="space-y-2">
                  <Label htmlFor="allocationTarget" className="text-sm font-medium flex items-center gap-1">
                    {formData.allocationType === "goal" ? "Select Goal" :
                     formData.allocationType === "debt" ? "Select Debt Account" :
                     formData.allocationType === "credit" ? "Select Credit Account" : "Select Target"}
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
                        "transition-all duration-200 h-9",
                        errors.allocationTarget ? "border-red-300 focus:border-red-500" : ""
                      )}
                      aria-describedby={errors.allocationTarget ? "allocationTarget-error" : undefined}
                    >
                      <SelectValue placeholder={
                        formData.allocationType === "goal" ? "Choose a goal" :
                        formData.allocationType === "debt" ? "Choose debt account" :
                        formData.allocationType === "credit" ? "Choose credit account" : "Choose target"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {allocationTargets.map((target) => (
                        <SelectItem key={target.id} value={target.id}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-sm">
                              {(target as any).title || (target as any).name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formData.allocationType === "goal" ?
                                `${Math.round(((target as any).currentAmount / (target as any).targetAmount) * 100)}%` :
                                formData.allocationType === "debt" ?
                                `${currencySymbol}${(target as any).balance}` :
                                formData.allocationType === "credit" ?
                                `${Math.round(((target as any).balance / (target as any).creditLimit) * 100)}%` :
                                ""}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {allocationTargets.length === 0 && (
                        <SelectItem value="none" disabled>
                          {formData.allocationType === "goal" ? "No goals available" :
                           formData.allocationType === "debt" ? "No debt accounts" :
                           formData.allocationType === "credit" ? "No credit accounts" : "No options"}
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
                      variant="outline"
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
                                style={{
                                  backgroundColor: categoryData?.color || "#3b82f6"
                                }} />
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
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
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

              {/* Receipt Image Preview */}
              {formData.receiptImage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Receipt Image
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFieldChange("receiptImage", "")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="relative">
                    <img
                      src={formData.receiptImage}
                      alt="Receipt"
                      className="w-full max-h-32 object-contain rounded-lg border border-border"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        <Receipt className="w-3 h-3 mr-1" />
                        Attached
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receipt image will be saved with this transaction
                  </p>
                </div>
              )}

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

      {/* Debt Creation Dialog */}
      <Dialog open={showDebtDialog} onOpenChange={setShowDebtDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Debt Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Transaction amount: {currencySymbol}{pendingTransaction?.amount?.toFixed(2)}
                <br />
                Available balance: {currencySymbol}{pendingTransactionResult?.availableBalance?.toFixed(2)}
                <br />
                Amount to record as debt: {currencySymbol}{pendingTransactionResult?.debtAmount?.toFixed(2)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Use Existing Debt or Create New</Label>
                <div className="mt-2 space-y-2">
                  {debtAccounts.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Select existing debt to attach the owed amount</Label>
                      <div className="grid gap-2">
                        {debtAccounts.map((d) => (
                          <Button
                            key={d.id}
                            variant={d.id === debtFormData.name ? 'outline' : 'ghost'}
                            size="sm"
                            onClick={() => {
                              setDebtFormData(prev => ({ ...prev, name: d.id }))
                            }}
                          >
                            {d.name} - {currencySymbol}{d.balance.toFixed(2)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No existing debts. You'll create a new one below.</p>
                  )}

                  <div className="pt-2">
                    <Label htmlFor="debt-name" className="text-sm font-medium">
                      New Debt Name <span className="text-orange-500">*</span>
                    </Label>
                    <Input
                      id="debt-name"
                      value={typeof debtFormData.name === 'string' && debtFormData.name && debtAccounts.some(d => d.id === debtFormData.name) ? '' : debtFormData.name}
                      onChange={(e) => setDebtFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Credit Card, Loan, etc."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebtMoreOptions(!showDebtMoreOptions)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  {showDebtMoreOptions ? "Hide" : "Show"} Additional Options
                </Button>
              </div>

              {showDebtMoreOptions && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <Label htmlFor="debt-minimum-payment" className="text-sm font-medium">
                      Minimum Payment ({currencySymbol})
                    </Label>
                    <Input
                      id="debt-minimum-payment"
                      type="number"
                      step="0.01"
                      min="0"
                      value={debtFormData.minimumPayment}
                      onChange={(e) => setDebtFormData(prev => ({ ...prev, minimumPayment: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="debt-interest-rate" className="text-sm font-medium">
                      Interest Rate (%)
                    </Label>
                    <Input
                      id="debt-interest-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={debtFormData.interestRate}
                      onChange={(e) => setDebtFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="debt-start-date" className="text-sm font-medium">
                      Start Date
                    </Label>
                    <Input
                      id="debt-start-date"
                      type="date"
                      value={debtFormData.startDate}
                      onChange={(e) => setDebtFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

              <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDebtDialog(false)
                  setPendingTransactionResult(null)
                  setDebtFormData({
                    name: "",
                    minimumPayment: "",
                    interestRate: "",
                    startDate: new Date().toISOString().split('T')[0]
                  })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const debtAmount = pendingTransactionResult?.debtAmount
                  const availableBalance = pendingTransactionResult?.availableBalance
                  if (!pendingTransaction || !pendingTransactionResult) return

                  const existingDebt = debtAccounts.find(d => d.id === debtFormData.name)
                  if (existingDebt) {
                    if (typeof addDebtToAccount === 'function') {
                      await addDebtToAccount(existingDebt.id, debtAmount, `Charge from transaction: ${pendingTransaction.description || pendingTransaction.category}`)
                      await completeTransactionWithDebt(pendingTransaction, existingDebt.name, existingDebt.id, availableBalance, debtAmount)
                    } else {
                      const newDebt = addDebtAccount({
                        name: existingDebt.name + " (from transaction)",
                        balance: debtAmount,
                        interestRate: existingDebt.interestRate || 0,
                        minimumPayment: existingDebt.minimumPayment || 0,
                        dueDate: existingDebt.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        createdAt: new Date().toISOString(),
                      })
                      await completeTransactionWithDebt(pendingTransaction, newDebt.name, newDebt.id, availableBalance, debtAmount)
                    }
                  } else {
                    await handleCreateDebt()
                    return
                  }

                  toast.success('Transaction completed with debt!', {
                    description: `${currencySymbol}${availableBalance.toFixed(2)} from balance + ${currencySymbol}${debtAmount.toFixed(2)} as debt`,
                    duration: 3000,
                  })

                  // Reset and close
                  setShowDebtDialog(false)
                  setPendingTransactionResult(null)
                  setPendingTransaction(null)
                  setDebtFormData({ name: "", minimumPayment: "", interestRate: "", startDate: new Date().toISOString().split('T')[0] })

                  setTimeout(() => {
                    resetForm()
                    handleOpenChange(false)
                  }, 1000)
                }}
                disabled={!( (debtAccounts.length > 0 && debtAccounts.some(d=>d.id===debtFormData.name)) || debtFormData.name.trim())}
                className="flex-1"
              >
                Use Selected / Create Debt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}