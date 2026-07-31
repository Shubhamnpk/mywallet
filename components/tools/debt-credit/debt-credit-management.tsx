"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CreditCard, TrendingDown, Plus, Minus, AlertTriangle, Trash2, ChevronDown, ChevronUp, Banknote, HandCoins, Users, Clock, Archive, MoreVertical, Edit } from "lucide-react"
import { useDebtCreditData } from "@/hooks/use-debt-credit-data"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { formatCurrency } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import { formatAppDate } from "@/lib/app-calendar"
import {
  validateAccountName,
  validateAmount,
  validateInterestRate,
  calculateInterest,
  getTimeSinceCreation,
  calculateMinimumPayment,
  calculatePayoffProjection,
  getCreditUtilizationStatus,
  getDebtPayoffStrategy
} from "./debt-credit-utils"
import { AddAccountDialog } from "./dialogs/add-account-dialog"
import { PaymentDialog } from "./dialogs/payment-dialog"
import { AddDebtDialog } from "./dialogs/add-debt-dialog"
import { DebtDetailsDialog } from "./dialogs/debt-details-dialog"
import { CreditDetailsDialog } from "./dialogs/credit-details-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"


export function DebtCreditManagement() {
  const { userProfile } = useUser()
  const calendarSystem = useCalendarSystem()
  const wallet = useDebtCreditData()
  const { debtAccounts, creditAccounts, addDebtAccount, addCreditAccount, updateDebtAccount, updateCreditAccount, deleteDebtAccount, deleteCreditAccount, makeDebtPayment, addDebtToAccount, addTransaction, balance, debtCreditTransactions } = wallet
  const hasMakeCreditPayment = typeof (wallet as any)?.makeCreditPayment === 'function'

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lendingAccounts = debtAccounts.filter((a) => a.direction === "lend" && !a.closedAt)
  const borrowedAccounts = debtAccounts.filter((a) => a.direction !== "lend" && !a.closedAt)
  const archivedAccounts = debtAccounts.filter((a) => a.closedAt)

  const [activeTab, setActiveTab] = useState("debt")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null)
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null)
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

  const [lendForm, setLendForm] = useState({
    name: "",
    phone: "",
    amount: "",
    interestRate: "",
    interestFrequency: "yearly",
    interestType: "simple",
    notes: "",
    source: "wallet" as "wallet" | "external",
  })

  // Auto-update fast debt checkbox based on interest and payment settings,
  // but only until the user manually toggles it
  const [fastDebtTouched, setFastDebtTouched] = useState(false)
  useEffect(() => {
    if (fastDebtTouched) return
    const interestRate = Number.parseFloat(debtForm.interestRate) || 0
    const minPayment = Number.parseFloat(debtForm.minimumPayment) || 0
    const shouldBeFastDebt = interestRate === 0 && minPayment === 0
    setDebtForm(prev => (prev.isFastDebt === shouldBeFastDebt ? prev : { ...prev, isFastDebt: shouldBeFastDebt }))
  }, [debtForm.interestRate, debtForm.minimumPayment, fastDebtTouched])

  // Reset the touch state when the dialog opens: respect loaded value when editing,
  // otherwise allow auto-detection on a fresh form
  useEffect(() => {
    if (showAddDialog) {
      setFastDebtTouched(!!editingDebtId)
    }
  }, [showAddDialog, editingDebtId])

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

  const handleSaveDebt = () => {
    if (!debtForm.name || !debtForm.balance || (!debtForm.isFastDebt && !debtForm.interestRate)) return

    const autoIsFastDebt = debtForm.isFastDebt ||
      (Number.parseFloat(debtForm.interestRate) === 0 && Number.parseFloat(debtForm.minimumPayment || '0') === 0)

    const payload = {
      name: debtForm.name,
      balance: Number.parseFloat(debtForm.balance),
      interestRate: autoIsFastDebt ? 0 : Number.parseFloat(debtForm.interestRate),
      minimumPayment: autoIsFastDebt ? 0 : (Number.parseFloat(debtForm.minimumPayment) || 0),
      dueDate: autoIsFastDebt ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : debtForm.dueDate,
      interestFrequency: debtForm.interestFrequency,
      interestType: debtForm.interestType,
      isFastDebt: autoIsFastDebt,
    }

    if (editingDebtId) {
      updateDebtAccount(editingDebtId, payload)
      setEditingDebtId(null)
    } else {
      addDebtAccount(payload as any)
    }

    setDebtForm({ name: "", balance: "", interestRate: "", interestFrequency: "yearly", interestType: "simple", minimumPayment: "", dueDate: "", isFastDebt: false })
    setShowAddDialog(false)
  }

  const handleSaveCredit = () => {
    if (!creditForm.name || !creditForm.balance || !creditForm.creditLimit || !creditForm.interestRate) return

    const payload = {
      name: creditForm.name,
      balance: Number.parseFloat(creditForm.balance),
      creditLimit: Number.parseFloat(creditForm.creditLimit),
      interestRate: Number.parseFloat(creditForm.interestRate),
      minimumPayment: Number.parseFloat(creditForm.minimumPayment) || 0,
      dueDate: creditForm.dueDate,
      interestFrequency: creditForm.interestFrequency,
      interestType: creditForm.interestType,
    }

    if (editingCreditId) {
      updateCreditAccount(editingCreditId, payload)
      setEditingCreditId(null)
    } else {
      addCreditAccount(payload as any)
    }

    setCreditForm({ name: "", balance: "", creditLimit: "", interestRate: "", interestFrequency: "yearly", interestType: "simple", minimumPayment: "", dueDate: "" })
    setShowAddDialog(false)
  }

  const handleSaveLend = () => {
    if (!lendForm.name || !lendForm.amount) return

    const amount = Number.parseFloat(lendForm.amount)
    const autoIsFastDebt = Number.parseFloat(lendForm.interestRate) === 0

    const payload = {
      name: lendForm.name,
      balance: amount,
      interestRate: autoIsFastDebt ? 0 : Number.parseFloat(lendForm.interestRate),
      minimumPayment: 0,
      dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      interestFrequency: lendForm.interestFrequency,
      interestType: lendForm.interestType,
      isFastDebt: autoIsFastDebt,
      direction: "lend" as const,
      source: lendForm.source,
      contactName: lendForm.name,
      contactPhone: lendForm.phone || undefined,
      notes: lendForm.notes || undefined,
    }

    if (editingDebtId) {
      updateDebtAccount(editingDebtId, payload)
      setEditingDebtId(null)
    } else {
      addDebtAccount(payload as any)
    }

    if (!editingDebtId && lendForm.source === "wallet") {
      addTransaction({
        type: "expense",
        amount: amount,
        description: `Lent to ${lendForm.name}`,
        category: "Lending",
        date: new Date().toISOString(),
        allocationType: "debt_loan",
      })
    }

    setLendForm({ name: "", phone: "", amount: "", interestRate: "", interestFrequency: "yearly", interestType: "simple", notes: "", source: "wallet" })
    setShowAddDialog(false)
  }

  const handlePayment = async () => {
    const amount = Number.parseFloat(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) return

    const isLendRepayment = paymentDialog.accountType === "debt" && debtAccounts.find(d => d.id === paymentDialog.accountId)?.direction === "lend"
    if (!isLendRepayment && amount > balance) return

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

    if (accruedInterest > 0 && userProfile) {
      alert(`Accrued interest: ${formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}\nTotal amount to pay: ${formatCurrency(debt.balance + accruedInterest, userProfile.currency, userProfile.customCurrency)}`)
    }
  }

  if (!userProfile) return null

  const totalDebt = borrowedAccounts.reduce((sum, debt) => sum + debt.balance, 0)
  const totalLent = lendingAccounts.reduce((sum, debt) => sum + debt.balance, 0)
  const totalCreditUsed = creditAccounts.reduce((sum, credit) => sum + credit.balance, 0)
  const totalCreditLimit = creditAccounts.reduce((sum, credit) => sum + credit.creditLimit, 0)
  const overallUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0

  // Calculate total accrued interest across all debt accounts (excluding fast debts and lending)
  const totalAccruedInterest = borrowedAccounts.reduce((sum, debt) => {
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5" />
         <h3 className="text-lg font-semibold flex items-center gap-2">
          Debt & Credit
        </h3>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Cards - Portfolio Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="bg-gradient-to-br from-red-500/15 via-red-500/5 to-transparent border-red-500/20 shadow-xl relative overflow-hidden group text-left col-span-2 md:col-span-1">
          <CardHeader className="pb-1 px-3 sm:px-6">
            <div className="flex items-center justify-between mb-1">
              <CardDescription className="text-foreground/60 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Total Liability</CardDescription>
              <div className="p-1 sm:p-1.5 bg-red-500/10 rounded-lg text-red-500">
                <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black font-mono tracking-tight text-red-600">
              {formatCurrency(totalDebt + totalCreditUsed, userProfile.currency, userProfile.customCurrency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-tight bg-red-500/10 text-red-600 border border-red-500/20">
                High Priority
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
                {debtAccounts.length + creditAccounts.length} account{(debtAccounts.length + creditAccounts.length) !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20 shadow-xl text-left">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">People Owe You</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-600">
              {formatCurrency(totalLent, userProfile.currency, userProfile.customCurrency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <Badge variant="outline" className="text-[8px] sm:text-[9px] font-black text-emerald-600 bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
              {lendingAccounts.length} Loan{lendingAccounts.length !== 1 ? "s" : ""}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md text-left">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Credit Health</CardDescription>
            <CardTitle className={`text-xl sm:text-2xl font-black font-mono ${utilizationStatus.color}`}>
              {overallUtilization.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest opacity-60">Avg Utilization</span>
          </CardContent>
        </Card>

        <Card className="hidden md:block bg-card/40 backdrop-blur-sm border-muted/50 shadow-md text-left">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Accrued Interest</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-black font-mono">
              {formatCurrency(totalAccruedInterest, userProfile.currency, userProfile.customCurrency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <Badge variant="outline" className="text-[8px] sm:text-[9px] font-black text-amber-600 bg-amber-50/50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">PROJECTED</Badge>
          </CardContent>
        </Card>
      </div>
      {/* Debt and Credit Management */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-9 mb-4">
              <TabsTrigger value="debt" className="text-sm font-medium px-3">
                Debt
              </TabsTrigger>
              <TabsTrigger value="lend" className="text-sm font-medium px-3">
                Lending
              </TabsTrigger>
              <TabsTrigger value="credit" className="text-sm font-medium px-3">
                Credit
              </TabsTrigger>
              <TabsTrigger value="history" className="text-sm font-medium px-3">
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="space-y-4">
              {borrowedAccounts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Debts Owed</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">You don't owe anyone right now.</p>
                  <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-destructive hover:bg-destructive/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Debt Account
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {borrowedAccounts.map((debt) => {
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
                      <Card
                        key={debt.id}
                        className="group overflow-hidden border-muted/50 hover:border-red-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/5 bg-card/40 backdrop-blur-sm"
                      >
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(debt.id)}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="pb-3 sm:pb-4 relative px-4 sm:px-6 cursor-pointer hover:bg-muted/30 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isFastDebt
                                    ? 'border-amber-500/20 text-amber-600 bg-amber-500/5'
                                    : 'border-red-500/20 text-red-600 bg-red-500/5'
                                    }`}
                                >
                                  {isFastDebt ? 'Fast Debt' : 'Debt Account'}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingDebtId(debt.id)
                                          setDebtForm({
                                            name: debt.name,
                                            balance: String(debt.balance),
                                            interestRate: String((debt as any).interestRate || 0),
                                            interestFrequency: (debt as any).interestFrequency || 'yearly',
                                            interestType: (debt as any).interestType || 'simple',
                                            minimumPayment: String((debt as any).minimumPayment || 0),
                                            dueDate: (debt as any).dueDate || '',
                                            isFastDebt: debt.isFastDebt || false,
                                          })
                                          setActiveTab("debt")
                                          setShowAddDialog(true)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setPaymentDialog({
                                          open: true,
                                          accountId: debt.id,
                                          accountName: debt.name,
                                          accountType: "debt",
                                        })}
                                        className="cursor-pointer"
                                      >
                                        <Banknote className="w-4 h-4 mr-2" />
                                        Quick Pay
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => deleteDebtAccount(debt.id)}
                                        className="cursor-pointer"
                                      >
                                        <Archive className="w-4 h-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-xl sm:text-2xl font-black group-hover:text-red-600 transition-colors">
                                    {debt.name}
                                  </CardTitle>
                                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                                <CardDescription className="line-clamp-1 font-medium italic opacity-70 text-xs sm:text-sm mt-1">
                                  {isFastDebt ? 'No interest accrual' : `${(debt as any).interestRate || 0}% interest rate`}
                                </CardDescription>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CardContent className="flex-1 pb-4 sm:pb-6 space-y-3 sm:space-y-4 px-4 sm:px-6">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Current Balance</span>
                                <span className="text-base sm:text-lg font-black font-mono text-red-600">
                                  {formatCurrency(debt.balance, userProfile.currency, userProfile.customCurrency)}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5 items-end">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">
                                  {isFastDebt ? 'No Interest' : 'Accrued Interest'}
                                </span>
                                <span className="text-base sm:text-lg font-black font-mono text-amber-600">
                                  {isFastDebt ? 'रु 0' : formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 sm:pt-4 border-t border-muted/20 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-muted/50 font-black text-[9px] sm:text-[10px] uppercase">
                                  {progress.toFixed(1)}% Repaid
                                </Badge>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 sm:h-8 rounded-lg text-primary font-bold group-hover:bg-primary/5 text-xs sm:text-sm">
                                  {isExpanded ? (
                                    <>
                                      <span className="hidden sm:inline">Hide Details</span>
                                      <span className="sm:hidden">Hide</span>
                                      <ChevronUp className="ml-1 w-3.5 h-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      <span className="hidden sm:inline">View Details</span>
                                      <span className="sm:hidden">View</span>
                                      <ChevronDown className="ml-1 w-3.5 h-3.5" />
                                    </>
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </CardContent>

                          <div className="h-1.5 w-full bg-muted/20">
                            <div
                              className={`h-full transition-all duration-1000 ${isFastDebt ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>

                          <CollapsibleContent>
                            <CardContent className="space-y-4 pt-4 border-t border-muted/20 bg-muted/5 px-4 sm:px-6">
                              {/* Quick Actions */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Debt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDebtDetailsDialog({ open: true, accountId: debt.id })}
                                  className="flex-1"
                                >
                                History ({recentTransactions.length})
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => applyInterestToDebt(debt.id)}
                                  disabled={accruedInterest <= 0}
                                  className="flex-1"
                                >
                                Interest
                                </Button>
                              </div>

                              {/* Recent Transactions */}
                              {recentTransactions.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="font-medium text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                                    📊 Recent Transactions
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDebtDetailsDialog({ open: true, accountId: debt.id })}
                                      className="text-[10px] sm:text-xs h-6 px-2"
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
                                            {formatAppDate(tx.date, calendarSystem)}
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

            <TabsContent value="lend" className="space-y-4">
              {lendingAccounts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <HandCoins className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Lending Records</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">Track money you've lent to friends and family.</p>
                  <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lending Record
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {lendingAccounts.map((debt) => {
                    const totalPaid = debtCreditTransactions
                      .filter((t: any) => t.accountId === debt.id && t.type === 'payment')
                      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0
                    const originalBalance = debt.balance + totalPaid
                    const progress = originalBalance > 0 ? (totalPaid / originalBalance) * 100 : 0
                    const isFastDebt = debt.isFastDebt
                    const timeElapsed = isFastDebt ? 0 : getTimeSinceCreation(debt.createdAt || new Date().toISOString())
                    const accruedInterest = isFastDebt ? 0 : calculateInterest(
                      debt.balance,
                      (debt as any).interestRate || 0,
                      timeElapsed,
                      (debt as any).interestFrequency || 'yearly',
                      (debt as any).interestType || 'simple'
                    )
                    const isExpanded = expandedAccounts.has(debt.id)

                    return (
                      <Card key={debt.id} className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent overflow-hidden">
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(debt.id)}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="pb-3 sm:pb-4 relative px-4 sm:px-6 cursor-pointer hover:bg-emerald-500/5 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 flex-shrink-0 mt-0.5">
                                    <HandCoins className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <CardTitle className="text-base sm:text-lg font-black">
                                        {debt.contactName || debt.name}
                                      </CardTitle>
                                      <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      {debt.contactPhone && (
                                        <span className="text-xs text-muted-foreground">{debt.contactPhone}</span>
                                      )}
                                      {(debt as any).source === "wallet" ? (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-blue-300 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400">Wallet</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-amber-300 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">External</Badge>
                                      )}
                                      {isFastDebt && (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-300 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">No Interest</Badge>
                                      )}
                                    </div>
                                    {debt.notes && (
                                      <p className="text-xs text-muted-foreground/70 mt-1 italic">{debt.notes}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="text-right shrink-0">
                                    <p className="text-lg font-black font-mono text-emerald-600">
                                      {formatCurrency(debt.balance, userProfile.currency, userProfile.customCurrency)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {progress >= 100 ? "Fully Repaid" : `${totalPaid > 0 ? `${progress.toFixed(0)}% repaid` : "Awaiting repayment"}`}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground mt-1">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingDebtId(debt.id)
                                          setLendForm({
                                            name: debt.contactName || debt.name,
                                            phone: debt.contactPhone || '',
                                            amount: String(debt.balance),
                                            interestRate: String((debt as any).interestRate || 0),
                                            interestFrequency: (debt as any).interestFrequency || 'yearly',
                                            interestType: (debt as any).interestType || 'simple',
                                            notes: debt.notes || '',
                                            source: (debt as any).source || 'external',
                                          })
                                          setActiveTab("lend")
                                          setShowAddDialog(true)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setPaymentDialog({ open: true, accountId: debt.id, accountName: debt.contactName || debt.name, accountType: "debt" })}
                                        className="cursor-pointer"
                                      >
                                        <Banknote className="w-4 h-4 mr-2" />
                                        Record Payment
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setDebtDetailsDialog({ open: true, accountId: debt.id })}
                                        className="cursor-pointer"
                                      >
                                        <Clock className="w-4 h-4 mr-2" />
                                        History
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => deleteDebtAccount(debt.id)}
                                        className="cursor-pointer"
                                      >
                                        <Archive className="w-4 h-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <Separator className="opacity-50" />
                            <CardContent className="p-4 space-y-4">
                              {/* Details grid */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {!isFastDebt && (debt as any).interestRate > 0 && (
                                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                                    <span className="text-muted-foreground text-xs">Interest</span>
                                    <span className="font-semibold text-xs">
                                      {(debt as any).interestRate}% ({(debt as any).interestFrequency || "yearly"})
                                    </span>
                                  </div>
                                )}
                                {accruedInterest > 0 && (
                                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/5 rounded-lg">
                                    <span className="text-muted-foreground text-xs">Accrued Interest</span>
                                    <span className="font-semibold text-xs text-emerald-600">
                                      {formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                                  <span className="text-muted-foreground text-xs">Lent</span>
                                  <span className="font-semibold text-xs">{formatCurrency(originalBalance, userProfile.currency, userProfile.customCurrency)}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                                  <span className="text-muted-foreground text-xs">Created</span>
                                  <span className="font-semibold text-xs">{formatAppDate(debt.createdAt, calendarSystem)}</span>
                                </div>
                              </div>

                              {/* Recent Repayment History */}
                              {debtCreditTransactions.filter((t: any) => t.accountId === debt.id).length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium text-xs flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5" />
                                      Repayment History
                                    </h5>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDebtDetailsDialog({ open: true, accountId: debt.id });
                                      }}
                                      className="text-[10px] h-6 px-2"
                                    >
                                      View All
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    {debtCreditTransactions
                                      .filter((t: any) => t.accountId === debt.id)
                                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                      .slice(0, 3)
                                      .map((tx: any) => (
                                        <div key={tx.id} className="flex justify-between items-center p-2 bg-emerald-500/5 rounded text-xs">
                                          <div>
                                            <p className="font-medium">
                                              {tx.type === 'payment' ? 'Repayment' : tx.type === 'closed' ? 'Closed' : 'Other'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              {formatAppDate(tx.date, calendarSystem)}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-emerald-600">
                                              +{formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              Remaining: {formatCurrency(tx.balanceAfter, userProfile.currency, userProfile.customCurrency)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
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
                      <Card
                        key={credit.id}
                        className="group overflow-hidden border-muted/50 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 bg-card/40 backdrop-blur-sm"
                      >
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(credit.id)}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="pb-3 sm:pb-4 relative px-4 sm:px-6 cursor-pointer hover:bg-muted/30 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${utilization > 70
                                    ? 'border-red-500/20 text-red-600 bg-red-500/5'
                                    : utilization > 30
                                      ? 'border-amber-500/20 text-amber-600 bg-amber-500/5'
                                      : 'border-green-500/20 text-green-600 bg-green-500/5'
                                    }`}
                                >
                                  {utilization > 70 ? 'High Utilization' : utilization > 30 ? 'Moderate Use' : 'Healthy Credit'}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingCreditId(credit.id)
                                          setCreditForm({
                                            name: credit.name,
                                            balance: String(credit.balance),
                                            creditLimit: String(credit.creditLimit),
                                            interestRate: String((credit as any).interestRate || 0),
                                            interestFrequency: (credit as any).interestFrequency || 'yearly',
                                            interestType: (credit as any).interestType || 'simple',
                                            minimumPayment: String((credit as any).minimumPayment || 0),
                                            dueDate: (credit as any).dueDate || '',
                                          })
                                          setActiveTab("credit")
                                          setShowAddDialog(true)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setPaymentDialog({
                                          open: true,
                                          accountId: credit.id,
                                          accountName: credit.name,
                                          accountType: "credit",
                                        })}
                                        className="cursor-pointer"
                                      >
                                        <Banknote className="w-4 h-4 mr-2" />
                                        Quick Pay
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => deleteCreditAccount(credit.id)}
                                        className="cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-xl sm:text-2xl font-black group-hover:text-primary transition-colors">
                                    {credit.name}
                                  </CardTitle>
                                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                                <CardDescription className="line-clamp-1 font-medium italic opacity-70 text-xs sm:text-sm mt-1">
                                  {formatCurrency(credit.creditLimit, userProfile.currency, userProfile.customCurrency)} credit limit
                                </CardDescription>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CardContent className="flex-1 pb-4 sm:pb-6 space-y-3 sm:space-y-4 px-4 sm:px-6">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Used Balance</span>
                                <span className="text-base sm:text-lg font-black font-mono text-primary">
                                  {formatCurrency(credit.balance, userProfile.currency, userProfile.customCurrency)}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5 items-end">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Available</span>
                                <span className="text-base sm:text-lg font-black font-mono text-green-600">
                                  {formatCurrency(available, userProfile.currency, userProfile.customCurrency)}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 sm:pt-4 border-t border-muted/20 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-muted/50 font-black text-[9px] sm:text-[10px] uppercase">
                                  {utilization.toFixed(1)}% Used
                                </Badge>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 sm:h-8 rounded-lg text-primary font-bold group-hover:bg-primary/5 text-xs sm:text-sm">
                                  {isExpanded ? (
                                    <>
                                      <span className="hidden sm:inline">Hide Details</span>
                                      <span className="sm:hidden">Hide</span>
                                      <ChevronUp className="ml-1 w-3.5 h-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      <span className="hidden sm:inline">View Details</span>
                                      <span className="sm:hidden">View</span>
                                      <ChevronDown className="ml-1 w-3.5 h-3.5" />
                                    </>
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </CardContent>

                          <div className="h-1.5 w-full bg-muted/20">
                            <div
                              className={`h-full transition-all duration-1000 ${utilization > 70 ? 'bg-red-500' : utilization > 30 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>

                          <CollapsibleContent>
                            <CardContent className="space-y-4 pt-4 border-t border-muted/20 bg-muted/5 px-4 sm:px-6">
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
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="px-3">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem
                                      onClick={() => setCreditDetailsDialog({ open: true, accountId: credit.id })}
                                      className="cursor-pointer"
                                    >
                                      <Clock className="w-4 h-4 mr-2" />
                                      Full History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => deleteCreditAccount(credit.id)}
                                      className="cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Recent Transactions */}
                              {recentTransactions.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="font-medium text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                                    Recent Transactions
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setCreditDetailsDialog({ open: true, accountId: credit.id })}
                                      className="text-[10px] sm:text-xs h-6 px-2"
                                    >
                                      View All
                                    </Button>
                                  </h5>
                                  <div className="space-y-1">
                                    {recentTransactions.map((tx: any) => (
                                      <div key={tx.id} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                                        <div>
                                          <p className="font-medium">
                                            {tx.type === 'payment' ? 'Payment' : tx.type === 'charge' ? 'Charge' : 'Other'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatAppDate(tx.date, calendarSystem)}
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

                              {/* Account Details */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
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

            <TabsContent value="history" className="space-y-4">
              {archivedAccounts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Archived Accounts</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">When you close a debt or lending account, it will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {archivedAccounts.map((account) => {
                    const isLend = account.direction === "lend"
                    const totalTransactions = debtCreditTransactions.filter((t: any) => t.accountId === account.id).length
                    return (
                      <Card key={account.id} className="border-muted/50 bg-muted/10">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={`p-2 rounded-full flex-shrink-0 mt-0.5 ${isLend ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                {isLend ? <HandCoins className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{account.contactName || account.name}</span>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground">Archived</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {isLend ? `Lent ` : `Borrowed `}
                                  {formatCurrency(account.originalBalance || account.balance + (account.originalBalance ? 0 : 0), userProfile.currency, userProfile.customCurrency)}
                                  {account.closedAt && ` · Closed ${formatAppDate(account.closedAt, calendarSystem)}`}
                                </p>
                                {account.notes && (
                                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{account.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-muted-foreground">{totalTransactions} transaction{totalTransactions !== 1 ? "s" : ""}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs mt-1"
                                onClick={() => setDebtDetailsDialog({ open: true, accountId: account.id })}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddAccountDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open) { setEditingDebtId(null); setEditingCreditId(null) }
          setShowAddDialog(open)
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        debtForm={debtForm}
        setDebtForm={setDebtForm}
        creditForm={creditForm}
        setCreditForm={setCreditForm}
        lendForm={lendForm}
        setLendForm={setLendForm}
        onAddDebt={handleSaveDebt}
        onAddCredit={handleSaveCredit}
        onAddLend={handleSaveLend}
        userProfile={userProfile}
        editingDebtId={editingDebtId}
        editingCreditId={editingCreditId}
        onFastDebtChange={() => setFastDebtTouched(true)}
      />

      <DebtDetailsDialog
        open={debtDetailsDialog.open}
        onOpenChange={(open) => setDebtDetailsDialog({ ...debtDetailsDialog, open })}
        accountId={debtDetailsDialog.accountId}
        debtAccounts={debtAccounts}
        transactions={debtCreditTransactions}
        userProfile={userProfile}
      />

      <CreditDetailsDialog
        open={creditDetailsDialog.open}
        onOpenChange={(open) => setCreditDetailsDialog({ ...creditDetailsDialog, open })}
        accountId={creditDetailsDialog.accountId}
        creditAccounts={creditAccounts}
        transactions={debtCreditTransactions}
        userProfile={userProfile}
      />

      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog(prev => ({ ...prev, open }))}
        paymentDialog={paymentDialog}
        setPaymentDialog={setPaymentDialog}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        debtAccounts={debtAccounts}
        creditAccounts={creditAccounts}
        onPayment={handlePayment}
        userProfile={userProfile}
        balance={balance}
      />

      <AddDebtDialog
        open={addDebtDialog.open}
        onOpenChange={(open) => setAddDebtDialog({ ...addDebtDialog, open })}
        addDebtDialog={addDebtDialog}
        setAddDebtDialog={setAddDebtDialog}
        amount={addDebtAmount}
        setAmount={setAddDebtAmount}
        onAdd={handleAddDebtCharge}
        isLoading={isLoading}
        error={error}
        userProfile={userProfile}
      />


    </div>
  )
}
