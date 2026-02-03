"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CreditCard, TrendingDown, Plus, Minus, AlertTriangle, Trash2, ChevronDown, ChevronRight, ChevronUp, Loader2, Zap } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import type { UserProfile } from "@/types/wallet"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"

// Security and validation constants
const SECURITY_CONSTANTS = {
  MAX_ACCOUNT_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_AMOUNT: 999999999.99,
  MIN_AMOUNT: 0.01,
  MAX_INTEREST_RATE: 100,
  MIN_INTEREST_RATE: 0,
  MAX_ARRAY_SIZE: 1000,
} as const

// Input validation helpers
const validateAccountName = (name: string): boolean => {
  return typeof name === 'string' &&
    name.length > 0 &&
    name.length <= SECURITY_CONSTANTS.MAX_ACCOUNT_NAME_LENGTH &&
    !/<script/i.test(name) // Basic XSS prevention
}

const validateAmount = (amount: number | string): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return !isNaN(num) &&
    isFinite(num) &&
    num >= SECURITY_CONSTANTS.MIN_AMOUNT &&
    num <= SECURITY_CONSTANTS.MAX_AMOUNT
}

const validateInterestRate = (rate: number | string): boolean => {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate
  return !isNaN(num) &&
    isFinite(num) &&
    num >= SECURITY_CONSTANTS.MIN_INTEREST_RATE &&
    num <= SECURITY_CONSTANTS.MAX_INTEREST_RATE
}

const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>'"&]/g, '').trim().substring(0, SECURITY_CONSTANTS.MAX_DESCRIPTION_LENGTH)
}

const validateArraySize = (arr: any[]): boolean => {
  return Array.isArray(arr) && arr.length <= SECURITY_CONSTANTS.MAX_ARRAY_SIZE
}

// Safe calculation helpers with boundary checks
const safeDivision = (numerator: number, denominator: number, fallback: number = 0): number => {
  return denominator !== 0 && isFinite(denominator) ? numerator / denominator : fallback
}

const safeParseFloat = (value: any, fallback: number = 0): number => {
  const parsed = parseFloat(value)
  return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed
}

interface DebtCreditManagementProps {
  userProfile: UserProfile
}

export function DebtCreditManagement({ userProfile }: DebtCreditManagementProps) {
  const wallet = useWalletData()
  const { debtAccounts, creditAccounts, addDebtAccount, addCreditAccount, deleteDebtAccount, deleteCreditAccount, makeDebtPayment, addDebtToAccount, balance, debtCreditTransactions } = wallet
  const hasMakeCreditPayment = typeof (wallet as any)?.makeCreditPayment === 'function'

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState("debt")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean
    accountId: string
    accountName: string
    accountType: "debt" | "credit"
  }>({
    open: false,
    accountId: "",
    accountName: "",
    accountType: "debt",
  })
  const [paymentAmount, setPaymentAmount] = useState("")
  const [addDebtAmount, setAddDebtAmount] = useState("")
  const [addDebtDialog, setAddDebtDialog] = useState<{
    open: boolean
    accountId: string
    accountName: string
  }>({
    open: false,
    accountId: "",
    accountName: "",
  })
  const [debtDetailsDialog, setDebtDetailsDialog] = useState<{ open: boolean; accountId: string | null }>({ open: false, accountId: null })
  const [creditDetailsDialog, setCreditDetailsDialog] = useState<{ open: boolean; accountId: string | null }>({ open: false, accountId: null })
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [insightsExpanded, setInsightsExpanded] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  const toggleExpanded = useCallback((accountId: string) => {
    setExpandedAccounts(prev => {
      const newExpanded = new Set(prev)
      newExpanded.has(accountId) ? newExpanded.delete(accountId) : newExpanded.add(accountId)
      return newExpanded
    })
  }, [])

  // Form states with validation
  const [debtForm, setDebtForm] = useState({
    name: "",
    balance: "",
    interestRate: "",
    interestFrequency: "yearly",
    interestType: "simple",
    minimumPayment: "",
    dueDate: "",
    isFastDebt: false,
  })

  const [creditForm, setCreditForm] = useState({
    name: "",
    balance: "",
    creditLimit: "",
    interestRate: "",
    interestFrequency: "yearly",
    interestType: "simple",
    minimumPayment: "",
    dueDate: "",
  })

  // Auto-update fast debt checkbox based on interest and payment settings
  useEffect(() => {
    const interestRate = Number.parseFloat(debtForm.interestRate) || 0
    const minPayment = Number.parseFloat(debtForm.minimumPayment) || 0
    const shouldBeFastDebt = interestRate === 0 && minPayment === 0

    if (shouldBeFastDebt && !debtForm.isFastDebt) {
      setDebtForm(prev => ({ ...prev, isFastDebt: true }))
    } else if (!shouldBeFastDebt && debtForm.isFastDebt) {
      // Don't auto-uncheck if user manually checked it
    }
  }, [debtForm.interestRate, debtForm.minimumPayment])

  // Form validation helpers
  const validateDebtForm = useCallback(() => {
    if (!validateAccountName(debtForm.name)) {
      setError("Invalid account name")
      return false
    }
    if (!validateAmount(debtForm.balance)) {
      setError("Invalid balance amount")
      return false
    }
    if (!debtForm.isFastDebt && !validateInterestRate(debtForm.interestRate)) {
      setError("Invalid interest rate")
      return false
    }
    if (debtForm.minimumPayment && !validateAmount(debtForm.minimumPayment)) {
      setError("Invalid minimum payment")
      return false
    }
    return true
  }, [debtForm])

  const validateCreditForm = useCallback(() => {
    if (!validateAccountName(creditForm.name)) {
      setError("Invalid account name")
      return false
    }
    if (!validateAmount(creditForm.balance)) {
      setError("Invalid balance amount")
      return false
    }
    if (!validateAmount(creditForm.creditLimit)) {
      setError("Invalid credit limit")
      return false
    }
    if (!validateInterestRate(creditForm.interestRate)) {
      setError("Invalid interest rate")
      return false
    }
    if (creditForm.minimumPayment && !validateAmount(creditForm.minimumPayment)) {
      setError("Invalid minimum payment")
      return false
    }
    return true
  }, [creditForm])

  const handleAddDebt = () => {
    if (!debtForm.name || !debtForm.balance || (!debtForm.isFastDebt && !debtForm.interestRate)) return

    // Auto-classify as fast debt if no interest and no minimum payment
    const autoIsFastDebt = debtForm.isFastDebt ||
      (Number.parseFloat(debtForm.interestRate) === 0 && Number.parseFloat(debtForm.minimumPayment || '0') === 0)

    addDebtAccount({
      name: debtForm.name,
      balance: Number.parseFloat(debtForm.balance),
      interestRate: autoIsFastDebt ? 0 : Number.parseFloat(debtForm.interestRate),
      minimumPayment: autoIsFastDebt ? 0 : (Number.parseFloat(debtForm.minimumPayment) || 0),
      dueDate: autoIsFastDebt ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : debtForm.dueDate,
      createdAt: new Date().toISOString(),
      interestFrequency: debtForm.interestFrequency,
      interestType: debtForm.interestType,
      isFastDebt: autoIsFastDebt,
    } as any)

    setDebtForm({ name: "", balance: "", interestRate: "", interestFrequency: "yearly", interestType: "simple", minimumPayment: "", dueDate: "", isFastDebt: false })
    setShowAddDialog(false)
  }

  const handleAddCredit = () => {
    if (!creditForm.name || !creditForm.balance || !creditForm.creditLimit || !creditForm.interestRate) return

    addCreditAccount({
      name: creditForm.name,
      balance: Number.parseFloat(creditForm.balance),
      creditLimit: Number.parseFloat(creditForm.creditLimit),
      interestRate: Number.parseFloat(creditForm.interestRate),
      minimumPayment: Number.parseFloat(creditForm.minimumPayment) || 0,
      dueDate: creditForm.dueDate,
      createdAt: new Date().toISOString(),
      interestFrequency: creditForm.interestFrequency,
      interestType: creditForm.interestType,
    } as any)

    setCreditForm({ name: "", balance: "", creditLimit: "", interestRate: "", interestFrequency: "yearly", interestType: "simple", minimumPayment: "", dueDate: "" })
    setShowAddDialog(false)
  }

  const handlePayment = async () => {
    const amount = Number.parseFloat(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) return

    if (paymentDialog.accountType === "debt") {
      const result = await makeDebtPayment(paymentDialog.accountId, amount)
      if (result && result.success) {
        setPaymentDialog({ open: false, accountId: "", accountName: "", accountType: "debt" })
        setPaymentAmount("")
      }
    } else if (paymentDialog.accountType === "credit") {
      // Only attempt credit payment if API exists
      if (!hasMakeCreditPayment) return
      try {
        const result = await (wallet as any).makeCreditPayment(paymentDialog.accountId, amount)
        if (result && result.success) {
          setPaymentDialog({ open: false, accountId: "", accountName: "", accountType: "credit" })
          setPaymentAmount("")
        }
      } catch (err) {
        // ignore or show toast in future
      }
    }
  }

  const handleAddDebtCharge = async () => {
    const amount = Number.parseFloat(addDebtAmount)
    if (!Number.isFinite(amount) || amount <= 0) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await addDebtToAccount(addDebtDialog.accountId, amount)
      if (result && result.success) {
        setAddDebtDialog({ open: false, accountId: "", accountName: "" })
        setAddDebtAmount("")
      } else {
        setError(result?.error || "Failed to add debt")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add debt")
    } finally {
      setIsLoading(false)
    }
  }

  // Enhanced Interest calculation functions
  const calculateInterest = (principal: number, rate: number, timeInYears: number, frequency: string, type: string) => {
    if (rate <= 0 || principal <= 0 || timeInYears <= 0) return 0

    const annualRate = rate / 100

    if (type === 'simple') {
      return principal * annualRate * timeInYears
    } else {
      // Compound interest with proper frequency handling
      const periodsPerYear = frequency === 'yearly' ? 1 : frequency === 'quarterly' ? 4 : 12
      const totalPeriods = timeInYears * periodsPerYear
      const periodicRate = annualRate / periodsPerYear

      return principal * (Math.pow(1 + periodicRate, totalPeriods) - 1)
    }
  }

  const getTimeSinceCreation = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    return diffTime / (1000 * 60 * 60 * 24 * 365.25) // years
  }

  // Calculate minimum payment based on debt amount and interest rate
  const calculateMinimumPayment = (balance: number, interestRate: number) => {
    // Standard minimum payment is typically 2-3% of balance or $25, whichever is greater
    const percentageBased = balance * 0.025 // 2.5% of balance
    const fixedMinimum = 25 // Minimum payment floor
    return Math.max(percentageBased, fixedMinimum)
  }

  // Calculate debt-to-income ratio
  const calculateDebtToIncomeRatio = (totalDebt: number, monthlyIncome: number) => {
    if (monthlyIncome <= 0) return 0
    return (totalDebt / (monthlyIncome * 12)) * 100
  }

  // Get credit utilization status
  const getCreditUtilizationStatus = (utilization: number) => {
    if (utilization <= 10) return { status: 'Excellent', color: 'text-green-600', recommendation: 'Keep it low!', score: 850 }
    if (utilization <= 30) return { status: 'Good', color: 'text-green-500', recommendation: 'Good utilization', score: 750 }
    if (utilization <= 50) return { status: 'Fair', color: 'text-yellow-600', recommendation: 'Consider paying down', score: 650 }
    if (utilization <= 70) return { status: 'Poor', color: 'text-orange-600', recommendation: 'Pay down immediately', score: 550 }
    return { status: 'Critical', color: 'text-red-600', recommendation: 'Reduce utilization now!', score: 450 }
  }

  // Calculate debt avalanche vs snowball recommendations
  const getDebtPayoffStrategy = (debts: any[]) => {
    if (debts.length === 0) return null

    const sortedByInterest = [...debts].sort((a, b) => ((b as any).interestRate || 0) - ((a as any).interestRate || 0))
    const sortedByBalance = [...debts].sort((a, b) => a.balance - b.balance)

    const avalancheSavings = sortedByInterest.reduce((sum, debt, index) => {
      const rate = (debt as any).interestRate || 0
      return sum + (rate * debt.balance * 0.01 * (debts.length - index) / 12)
    }, 0)

    return {
      avalancheDebts: sortedByInterest,
      snowballDebts: sortedByBalance,
      recommendedSavings: avalancheSavings,
      strategy: avalancheSavings > 100 ? 'avalanche' : 'snowball'
    }
  }

  // Calculate late fee if payment is missed
  const calculateLateFee = (balance: number, daysLate: number) => {
    const lateFee = Math.min(balance * 0.05, 39) // 5% of balance or $39 max
    return lateFee + (daysLate > 10 ? balance * 0.01 * (daysLate - 10) / 30 : 0) // Additional fees for very late payments
  }

  // Calculate payoff time and total interest
  const calculatePayoffProjection = (balance: number, monthlyPayment: number, interestRate: number, frequency: string, type: string) => {
    if (monthlyPayment <= 0 || balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0 }

    let remainingBalance = balance
    let totalInterest = 0
    let months = 0
    const monthlyRate = interestRate / 100 / 12

    while (remainingBalance > 0 && months < 600) { // Max 50 years
      const interestPayment = remainingBalance * monthlyRate
      const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance)

      totalInterest += interestPayment
      remainingBalance -= principalPayment
      months++

      if (remainingBalance <= 0.01) break
    }

    return {
      months,
      totalInterest,
      totalPaid: balance + totalInterest,
      monthlyPayment
    }
  }

  // Function to apply accrued interest to debt balance
  const applyInterestToDebt = (debtId: string) => {
    const debt = debtAccounts.find(d => d.id === debtId)
    if (!debt) return

    const timeElapsed = getTimeSinceCreation(debt.createdAt || new Date().toISOString())
    const accruedInterest = calculateInterest(
      debt.balance,
      (debt as any).interestRate || 0,
      timeElapsed,
      (debt as any).interestFrequency || 'yearly',
      (debt as any).interestType || 'simple'
    )

    if (accruedInterest > 0) {
      // Here you would typically call an API to update the debt balance
      // For now, we'll just show an alert with the calculated interest
      alert(`Accrued interest: ${formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}\nTotal amount to pay: ${formatCurrency(debt.balance + accruedInterest, userProfile.currency, userProfile.customCurrency)}`)
    }
  }

  const totalDebt = debtAccounts.reduce((sum, debt) => sum + debt.balance, 0)
  const totalCreditUsed = creditAccounts.reduce((sum, credit) => sum + credit.balance, 0)
  const totalCreditLimit = creditAccounts.reduce((sum, credit) => sum + credit.creditLimit, 0)
  const overallUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0

  // Calculate total accrued interest across all debt accounts (excluding fast debts)
  const totalAccruedInterest = debtAccounts.reduce((sum, debt) => {
    if (debt.isFastDebt) return sum
    const timeElapsed = getTimeSinceCreation(debt.createdAt || new Date().toISOString())
    const accrued = calculateInterest(
      debt.balance,
      (debt as any).interestRate || 0,
      timeElapsed,
      (debt as any).interestFrequency || 'yearly',
      (debt as any).interestType || 'simple'
    )
    return sum + accrued
  }, 0)

  // Get credit utilization status
  const utilizationStatus = getCreditUtilizationStatus(overallUtilization)

  // Get debt payoff strategy
  const payoffStrategy = getDebtPayoffStrategy(debtAccounts)

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Theme Colors */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Debt & Credit Management</h3>
            <p className="text-sm text-muted-foreground">{debtAccounts.length + creditAccounts.length} accounts</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <Card className="border-destructive/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Total Debt</p>
                <p className="text-lg font-bold text-destructive truncate">{formatCurrency(totalDebt, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Credit Used</p>
                <p className="text-lg font-bold text-primary truncate">{formatCurrency(totalCreditUsed, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Debt and Credit Management */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-9 mb-4">
              <TabsTrigger value="debt" className="text-sm font-medium px-3">
                Debt ({debtAccounts.length})
              </TabsTrigger>
              <TabsTrigger value="credit" className="text-sm font-medium px-3">
                Credit ({creditAccounts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="space-y-4">
              {debtAccounts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Debt Accounts Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">Start tracking your debts to stay on top of your financial health.</p>
                  <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-destructive hover:bg-destructive/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Debt Account
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {debtAccounts.map((debt) => {
                    // Calculate debt reduction progress
                    const totalPaid = debtCreditTransactions
                      .filter((t: any) => t.accountId === debt.id && t.type === 'payment')
                      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0
                    const originalBalance = debt.balance + totalPaid
                    const progress = originalBalance > 0 ? (totalPaid / originalBalance) * 100 : 0

                    const isFastDebt = debt.isFastDebt
                    const timeElapsed = isFastDebt ? 0 : getTimeSinceCreation(debt.createdAt || new Date().toISOString())
                    const accruedInterest = isFastDebt ? 0 : calculateInterest(
                      debt.balance,
                      debt.interestRate || 0,
                      timeElapsed,
                      (debt as any).interestFrequency || 'yearly',
                      (debt as any).interestType || 'simple'
                    )
                    const totalWithInterest = debt.balance + accruedInterest

                    // Calculate payoff projection (skip for fast debts)
                    const monthlyPayment = isFastDebt ? 0 : ((debt as any).minimumPayment || calculateMinimumPayment(debt.balance, (debt as any).interestRate || 0))
                    const payoffProjection = isFastDebt ? null : calculatePayoffProjection(
                      debt.balance,
                      monthlyPayment,
                      (debt as any).interestRate || 0,
                      (debt as any).interestFrequency || 'yearly',
                      (debt as any).interestType || 'simple'
                    )

                    const isExpanded = expandedAccounts.has(debt.id)
                    const recentTransactions = debtCreditTransactions
                      .filter((t: any) => t.accountId === debt.id)
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 3)

                    return (
                      <Card key={debt.id} className="transition border">
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(debt.id)}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer flex-1">
                                  <TrendingDown className="w-5 h-5 text-primary" />
                                  <CardTitle className="text-lg">{debt.name}</CardTitle>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </CollapsibleTrigger>
                              <div className="flex items-center gap-2">
                                <Badge variant={isFastDebt ? "secondary" : "destructive"} className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {isFastDebt ? "Fast Debt" : "Debt"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteDebtAccount(debt.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2 mt-3">
                              <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-1">
                                  Balance: {formatCurrency(debt.balance, userProfile.currency, userProfile.customCurrency)}
                                </span>
                                {!isFastDebt && <span>Interest: {formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}</span>}
                              </div>
                              <Progress value={progress} className="h-2 rounded-full" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{progress.toFixed(1)}% paid off</span>
                                <span>
                                  {totalPaid > 0
                                    ? `${formatCurrency(totalPaid, userProfile.currency, userProfile.customCurrency)} paid`
                                    : 'No payments yet'}
                                </span>
                              </div>
                            </div>
                          </CardHeader>

                          <CollapsibleContent>
                            <CardContent className="space-y-4 pt-0">
                              {/* Quick Actions */}
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPaymentDialog({
                                      open: true,
                                      accountId: debt.id,
                                      accountName: debt.name,
                                      accountType: "debt",
                                    })
                                  }
                                  disabled={balance <= 0}
                                  className="flex-1"
                                >
                                  <Minus className="w-3 h-3 mr-1" />
                                  Make Payment
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setAddDebtDialog({
                                      open: true,
                                      accountId: debt.id,
                                      accountName: debt.name,
                                    })
                                  }
                                  className="flex-1"
                                >
                                  ➕ Add Debt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDebtDetailsDialog({ open: true, accountId: debt.id })}
                                  className="flex-1"
                                >
                                  📊 History ({recentTransactions.length})
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => applyInterestToDebt(debt.id)}
                                  disabled={accruedInterest <= 0}
                                  className="flex-1"
                                >
                                  💰 Interest
                                </Button>
                              </div>

                              {/* Recent Transactions */}
                              {recentTransactions.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="font-medium text-sm flex items-center gap-2">
                                    📊 Recent Transactions
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDebtDetailsDialog({ open: true, accountId: debt.id })}
                                      className="text-xs h-6 px-2"
                                    >
                                      View All
                                    </Button>
                                  </h5>
                                  <div className="space-y-1">
                                    {recentTransactions.map((tx: any) => (
                                      <div key={tx.id} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                                        <div>
                                          <p className="font-medium">
                                            {tx.type === 'payment' ? '💰 Payment' : tx.type === 'charge' ? '➕ Charge' : '📝 Other'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(tx.date).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className={`font-semibold ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            After: {formatCurrency(tx.balanceAfter, userProfile.currency, userProfile.customCurrency)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Payoff Projection */}
                              {payoffProjection && payoffProjection.months > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
                                  <h5 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-200">🎯 Payoff Projection</h5>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Time to Pay Off</p>
                                      <p className="font-bold text-blue-800 dark:text-blue-200">
                                        {payoffProjection.months} months
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        ({Math.floor(payoffProjection.months / 12)}y {payoffProjection.months % 12}m)
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Total Interest</p>
                                      <p className="font-bold text-blue-800 dark:text-blue-200">
                                        {formatCurrency(payoffProjection.totalInterest, userProfile.currency, userProfile.customCurrency)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Account Details */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {!isFastDebt && (
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                    <span>Rate: {(debt as any).interestRate || 0}%</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                  <span>Min Pay: {formatCurrency((debt as any).minimumPayment || 0, userProfile.currency, userProfile.customCurrency)}</span>
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
            </TabsContent>

            <TabsContent value="credit" className="space-y-4">
              {creditAccounts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Credit Accounts Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">Add credit accounts to track utilization and manage payments.</p>
                  <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Credit Account
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {creditAccounts.map((credit) => {
                    const utilization = (credit.balance / credit.creditLimit) * 100
                    const available = credit.creditLimit - credit.balance

                    const isExpanded = expandedAccounts.has(credit.id)
                    const recentTransactions = debtCreditTransactions
                      .filter((t: any) => t.accountId === credit.id)
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 3)


                    return (
                      <Card key={credit.id} className="transition border">
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(credit.id)}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer flex-1">
                                  <CreditCard className="w-5 h-5 text-primary" />
                                  <CardTitle className="text-lg">{credit.name}</CardTitle>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </CollapsibleTrigger>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={utilization > 70 ? "destructive" : utilization > 30 ? "secondary" : "default"}
                                  className="flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Credit
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCreditAccount(credit.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2 mt-3">
                              <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-1">
                                  Balance: {formatCurrency(credit.balance, userProfile.currency, userProfile.customCurrency)}
                                </span>
                                <span>Available: {formatCurrency(available, userProfile.currency, userProfile.customCurrency)}</span>
                              </div>
                              <Progress value={utilization} className="h-2 rounded-full" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{utilization.toFixed(1)}% utilized</span>
                                <span>Limit: {formatCurrency(credit.creditLimit, userProfile.currency, userProfile.customCurrency)}</span>
                              </div>
                            </div>
                          </CardHeader>

                          <CollapsibleContent>
                            <CardContent className="space-y-4 pt-0">
                              {/* Quick Actions */}
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPaymentDialog({
                                      open: true,
                                      accountId: credit.id,
                                      accountName: credit.name,
                                      accountType: "credit",
                                    })
                                  }
                                  disabled={balance <= 0 || !hasMakeCreditPayment}
                                  className="flex-1"
                                >
                                  <Minus className="w-3 h-3 mr-1" />
                                  Make Payment
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCreditDetailsDialog({ open: true, accountId: credit.id })}
                                  className="flex-1"
                                >
                                  📊 History ({recentTransactions.length})
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCreditDetailsDialog({ open: true, accountId: credit.id })}
                                  className="flex-1"
                                >
                                  💳 Details
                                </Button>
                              </div>

                              {/* Recent Transactions */}
                              {recentTransactions.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="font-medium text-sm flex items-center gap-2">
                                    📊 Recent Transactions
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setCreditDetailsDialog({ open: true, accountId: credit.id })}
                                      className="text-xs h-6 px-2"
                                    >
                                      View All
                                    </Button>
                                  </h5>
                                  <div className="space-y-1">
                                    {recentTransactions.map((tx: any) => (
                                      <div key={tx.id} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                                        <div>
                                          <p className="font-medium">
                                            {tx.type === 'payment' ? '💰 Payment' : tx.type === 'charge' ? '💳 Charge' : '📝 Other'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(tx.date).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className={`font-semibold ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            After: {formatCurrency(tx.balanceAfter, userProfile.currency, userProfile.customCurrency)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Credit Health Status */}
                              <div className={`p-3 rounded-lg border ${utilization <= 10 ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30' :
                                utilization <= 30 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/30' :
                                  utilization <= 50 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800/30' :
                                    utilization <= 70 ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800/30' :
                                      'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800/30'}`}>
                                <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  💳 Credit Health Status
                                  <Badge variant="outline" className="text-xs">
                                    {utilization <= 10 ? 'Excellent' :
                                      utilization <= 30 ? 'Good' :
                                        utilization <= 50 ? 'Fair' :
                                          utilization <= 70 ? 'Poor' : 'Critical'}
                                  </Badge>
                                </h5>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Utilization</p>
                                    <p className="font-bold">{utilization.toFixed(1)}%</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Available Credit</p>
                                    <p className="font-bold text-green-600">{formatCurrency(available, userProfile.currency, userProfile.customCurrency)}</p>
                                  </div>
                                </div>
                                <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 rounded-lg border">
                                  <p className="font-medium text-sm mb-1">💡 Recommendation:</p>
                                  <p className="text-sm">
                                    {utilization <= 10 ? '🎉 Excellent! Keep your utilization low for the best credit scores.' :
                                      utilization <= 30 ? '👍 Good job! Your utilization is in the ideal range.' :
                                        utilization <= 50 ? '⚠️ Consider paying down your balance to improve your credit health.' :
                                          utilization <= 70 ? '🚨 High utilization! Pay down immediately to avoid credit damage.' :
                                            '🚨 Critical! Reduce utilization urgently to protect your credit score.'}
                                  </p>
                                </div>
                              </div>

                              {/* Account Details */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                  <span>Rate: {credit.interestRate}%</span>
                                  <span>Rate: {(credit as any).interestRate || 0}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                  <span>Min Pay: {formatCurrency((credit as any).minimumPayment || 0, userProfile.currency, userProfile.customCurrency)}</span>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5" />
              Add {activeTab === "debt" ? "Debt" : "Credit"} Account
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="debt" className="text-sm">Debt Account</TabsTrigger>
              <TabsTrigger value="credit" className="text-sm">Credit Account</TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="debt-name" className="text-sm font-medium">Account Name</Label>
                <Input
                  id="debt-name"
                  value={debtForm.name}
                  onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })}
                  placeholder="e.g., Student Loan, Credit Card"
                  className="h-11"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="debt-fast"
                  checked={debtForm.isFastDebt}
                  onCheckedChange={(checked) => setDebtForm({ ...debtForm, isFastDebt: checked as boolean })}
                />
                <Label htmlFor="debt-fast" className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Fast Debt (No Interest, No Minimum Payment)
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="debt-balance" className="text-sm font-medium">
                  Current Balance ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                </Label>
                <Input
                  id="debt-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={debtForm.balance}
                  onChange={(e) => setDebtForm({ ...debtForm, balance: e.target.value })}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>

              {!debtForm.isFastDebt && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="debt-rate" className="text-sm font-medium">Interest Rate (%)</Label>
                    <Input
                      id="debt-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={debtForm.interestRate}
                      onChange={(e) => setDebtForm({ ...debtForm, interestRate: e.target.value })}
                      placeholder="0.00"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debt-frequency" className="text-sm font-medium">Interest Frequency</Label>
                    <select
                      id="debt-frequency"
                      value={debtForm.interestFrequency}
                      onChange={(e) => setDebtForm({ ...debtForm, interestFrequency: e.target.value })}
                      title="Interest Frequency"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="yearly">Yearly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debt-type" className="text-sm font-medium">Interest Type</Label>
                    <select
                      id="debt-type"
                      value={debtForm.interestType}
                      onChange={(e) => setDebtForm({ ...debtForm, interestType: e.target.value })}
                      title="Interest Type"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="simple">Simple Interest</option>
                      <option value="compound">Compound Interest</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="debt-payment" className="text-sm font-medium">
                  Min Payment ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                </Label>
                <Input
                  id="debt-payment"
                  type="number"
                  step="0.01"
                  min="0"
                  value={debtForm.minimumPayment}
                  onChange={(e) => setDebtForm({ ...debtForm, minimumPayment: e.target.value })}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1 h-11">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDebt}
                  className="flex-1 h-11 bg-destructive hover:bg-destructive/90"
                  disabled={!debtForm.name || !debtForm.balance || (!debtForm.isFastDebt && !debtForm.interestRate)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {debtForm.isFastDebt ? "Fast Debt" : "Debt"} Account
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="credit" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="credit-name" className="text-sm font-medium">Account Name</Label>
                <Input
                  id="credit-name"
                  value={creditForm.name}
                  onChange={(e) => setCreditForm({ ...creditForm, name: e.target.value })}
                  placeholder="e.g., Visa Card, Mastercard"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit-balance" className="text-sm font-medium">
                    Current Balance ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                  </Label>
                  <Input
                    id="credit-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditForm.balance}
                    onChange={(e) => setCreditForm({ ...creditForm, balance: e.target.value })}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit-limit" className="text-sm font-medium">
                    Credit Limit ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                  </Label>
                  <Input
                    id="credit-limit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditForm.creditLimit}
                    onChange={(e) => setCreditForm({ ...creditForm, creditLimit: e.target.value })}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit-rate" className="text-sm font-medium">Interest Rate (%)</Label>
                  <Input
                    id="credit-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={creditForm.interestRate}
                    onChange={(e) => setCreditForm({ ...creditForm, interestRate: e.target.value })}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit-frequency" className="text-sm font-medium">Interest Frequency</Label>
                  <select
                    id="credit-frequency"
                    value={creditForm.interestFrequency}
                    onChange={(e) => setCreditForm({ ...creditForm, interestFrequency: e.target.value })}
                    title="Interest Frequency"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit-type" className="text-sm font-medium">Interest Type</Label>
                  <select
                    id="credit-type"
                    value={creditForm.interestType}
                    onChange={(e) => setCreditForm({ ...creditForm, interestType: e.target.value })}
                    title="Interest Type"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="simple">Simple Interest</option>
                    <option value="compound">Compound Interest</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-payment" className="text-sm font-medium">
                  Min Payment ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                </Label>
                <Input
                  id="credit-payment"
                  type="number"
                  step="0.01"
                  min="0"
                  value={creditForm.minimumPayment}
                  onChange={(e) => setCreditForm({ ...creditForm, minimumPayment: e.target.value })}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1 h-11">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCredit}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90"
                  disabled={!creditForm.name || !creditForm.balance || !creditForm.creditLimit || !creditForm.interestRate}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credit Account
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Debt Details Dialog */}
      <Dialog open={debtDetailsDialog.open} onOpenChange={(open) => setDebtDetailsDialog({ ...debtDetailsDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Debt Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {debtDetailsDialog.accountId ? (
              (() => {
                const acc = debtAccounts.find((d) => d.id === debtDetailsDialog.accountId)
                const txs = debtCreditTransactions
                  .filter((t: any) => t.accountId === debtDetailsDialog.accountId)
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

                return (
                  <div>
                    <h4 className="font-semibold mb-2">{acc?.name}</h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground">Principal: {formatCurrency(acc?.balance || 0, userProfile.currency, userProfile.customCurrency)}</p>
                      {(() => {
                        const isFastDebt = acc?.isFastDebt
                        const timeElapsed = isFastDebt ? 0 : getTimeSinceCreation(acc?.createdAt || new Date().toISOString())
                        const accruedInterest = isFastDebt ? 0 : calculateInterest(
                          acc?.balance || 0,
                          acc?.interestRate || 0,
                          timeElapsed,
                          (acc as any)?.interestFrequency || 'yearly',
                          (acc as any)?.interestType || 'simple'
                        )
                        const totalWithInterest = (acc?.balance || 0) + accruedInterest

                        return (
                          <>
                            {isFastDebt ? (
                              <p className="text-sm text-muted-foreground">Fast Debt - No interest accrued</p>
                            ) : (
                              accruedInterest > 0 && (
                                <>
                                  <p className="text-sm text-muted-foreground">Accrued Interest: {formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}</p>
                                  <p className="text-sm font-medium text-destructive">Total Balance: {formatCurrency(totalWithInterest, userProfile.currency, userProfile.customCurrency)}</p>
                                </>
                              )
                            )}
                            {!isFastDebt && (
                              <div className="text-xs text-muted-foreground mt-2">
                                <p>Interest Rate: {acc?.interestRate}% ({(acc as any)?.interestFrequency || 'yearly'})</p>
                                <p>Type: {(acc as any)?.interestType === 'simple' ? 'Simple Interest' : 'Compound Interest'}</p>
                                <p>Time Elapsed: {timeElapsed.toFixed(2)} years</p>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div className="space-y-2">
                      {txs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No transactions for this debt.</p>
                      ) : (
                        txs.map((tx: any) => (
                          <div key={tx.id} className="p-2 border rounded">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium">{tx.type === 'payment' ? 'Payment' : tx.type === 'charge' ? 'Charge' : 'Closed'}</p>
                                <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency)}</p>
                                <p className="text-xs text-muted-foreground">After: {formatCurrency(tx.balanceAfter, userProfile.currency, userProfile.customCurrency)}</p>
                              </div>
                            </div>
                            {tx.description && <p className="text-sm text-muted-foreground mt-2">{tx.description}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })()
            ) : (
              <p>Select a debt to view details.</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDebtDetailsDialog({ open: false, accountId: null })} className="flex-1">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Details Dialog */}
      <Dialog open={creditDetailsDialog.open} onOpenChange={(open) => setCreditDetailsDialog({ ...creditDetailsDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Credit Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {creditDetailsDialog.accountId ? (
              (() => {
                const acc = creditAccounts.find((c) => c.id === creditDetailsDialog.accountId)
                const txs = debtCreditTransactions
                  .filter((t: any) => t.accountId === creditDetailsDialog.accountId)
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

                return (
                  <div>
                    <h4 className="font-semibold mb-2">{acc?.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Balance: {formatCurrency(acc?.balance || 0, userProfile.currency, userProfile.customCurrency)} / {formatCurrency(acc?.creditLimit || 0, userProfile.currency, userProfile.customCurrency)}
                    </p>
                    <div className="space-y-2">
                      {txs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No transactions for this credit account.</p>
                      ) : (
                        txs.map((tx: any) => (
                          <div key={tx.id} className="p-2 border rounded">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium">{tx.type === 'payment' ? 'Payment' : tx.type === 'charge' ? 'Charge' : 'Purchase'}</p>
                                <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency)}</p>
                                <p className="text-xs text-muted-foreground">After: {formatCurrency(tx.balanceAfter, userProfile.currency, userProfile.customCurrency)}</p>
                              </div>
                            </div>
                            {tx.description && <p className="text-sm text-muted-foreground mt-2">{tx.description}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })()
            ) : (
              <p>Select a credit account to view details.</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreditDetailsDialog({ open: false, accountId: null })} className="flex-1">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Minus className="w-5 h-5 text-primary" />
              Make Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Payment to:</p>
              <p className="font-semibold text-lg">{paymentDialog.accountName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {paymentDialog.accountType === "debt" ? "Debt Account" : "Credit Account"}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Payment Amount ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-lg"
              />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Available balance:</span>
                <span className="font-semibold text-chart-3">
                  {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setPaymentDialog({ open: false, accountId: "", accountName: "", accountType: "debt" })}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentDialog({ open: false, accountId: "", accountName: "", accountType: "debt" })
                  setShowAddDialog(true)
                  setActiveTab(paymentDialog.accountType)
                }}
                className="flex-1 h-11"
              >
                Add Account
              </Button>
              <Button
                onClick={handlePayment}
                disabled={
                  !paymentAmount || Number.parseFloat(paymentAmount) <= 0 || Number.parseFloat(paymentAmount) > balance
                }
                className="flex-1 h-11 bg-chart-3 hover:bg-chart-3/90 text-white"
              >
                <Minus className="w-4 h-4 mr-2" />
                Make Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Debt Dialog */}
      <Dialog open={addDebtDialog.open} onOpenChange={(open) => setAddDebtDialog({ ...addDebtDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              ➕ Add Debt
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Add debt to:</p>
              <p className="font-semibold text-lg">{addDebtDialog.accountName}</p>
              <p className="text-sm text-muted-foreground mt-1">Debt Account</p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Debt Amount ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={addDebtAmount}
                onChange={(e) => setAddDebtAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-lg"
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setAddDebtDialog({ open: false, accountId: "", accountName: "" })}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddDebtCharge}
                disabled={!addDebtAmount || Number.parseFloat(addDebtAmount) <= 0 || isLoading}
                className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    ➕ Add Debt
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-primary/20">
        <Collapsible open={insightsExpanded} onOpenChange={setInsightsExpanded}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-3 cursor-pointer hover:bg-primary/5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm text-primary">Financial Insights</h4>
                  <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                    {insightsExpanded ? 'Hide' : 'Show'} Insights
                  </Badge>
                </div>
                {insightsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-primary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-primary" />
                )}
              </div>
              {/* Quick Summary - Always Visible */}
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div className="text-center p-2 bg-primary/5 rounded border border-primary/10">
                  <p className="text-muted-foreground text-xs">Strategy</p>
                  <p className="font-medium text-primary">
                    {payoffStrategy?.strategy === 'avalanche' ? 'Avalanche' : 'Snowball'}
                  </p>
                </div>
                <div className="text-center p-2 bg-chart-2/5 rounded border border-chart-2/10">
                  <p className="text-muted-foreground text-xs">Credit Status</p>
                  <p className={`font-medium ${utilizationStatus.color}`}>{utilizationStatus.status}</p>
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-3 px-3 border-t border-primary/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {/* Debt Payoff Strategy */}
                {payoffStrategy && totalDebt > 0 && (
                  <Card className="border-primary/20">
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-primary" />
                        Payoff Strategy
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-primary">Recommended: {payoffStrategy.strategy === 'avalanche' ? 'Debt Avalanche' : 'Debt Snowball'}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Savings: {formatCurrency(payoffStrategy.recommendedSavings, userProfile.currency, userProfile.customCurrency)}/year
                        </p>
                        <div className="mt-2 p-1.5 bg-primary/5 rounded border border-primary/10">
                          <p className="font-medium text-primary text-xs">Next Priority:</p>
                          <p className="text-primary/80 text-xs truncate">
                            {payoffStrategy.avalancheDebts[0]?.name} ({(payoffStrategy.avalancheDebts[0] as any)?.interestRate || 0}% interest)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Credit Health Insights */}
                {totalCreditUsed > 0 && (
                  <Card className="border-chart-2/20">
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-chart-2" />
                        Credit Health
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Utilization:</span>
                          <span className={`font-medium ${utilizationStatus.color}`}>{overallUtilization.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={`font-medium ${utilizationStatus.color}`}>{utilizationStatus.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Score:</span>
                          <span className={`font-medium ${utilizationStatus.color}`}>{utilizationStatus.score}+</span>
                        </div>
                        <div className="mt-2 p-1.5 bg-chart-2/5 rounded border border-chart-2/10">
                          <p className="font-medium text-chart-2 text-xs">Tip:</p>
                          <p className="text-chart-2/80 text-xs">{utilizationStatus.recommendation}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
