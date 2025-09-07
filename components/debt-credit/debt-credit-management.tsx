"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, TrendingDown, Plus, Minus, AlertTriangle, Trash2 } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import type { UserProfile } from "@/types/wallet"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"

interface DebtCreditManagementProps {
  userProfile: UserProfile
}

export function DebtCreditManagement({ userProfile }: DebtCreditManagementProps) {
  const wallet = useWalletData()
  const { debtAccounts, creditAccounts, addDebtAccount, addCreditAccount, deleteDebtAccount, deleteCreditAccount, makeDebtPayment, balance, debtCreditTransactions } = wallet
  const hasMakeCreditPayment = typeof (wallet as any)?.makeCreditPayment === 'function'

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
  const [debtDetailsDialog, setDebtDetailsDialog] = useState<{ open: boolean; accountId: string | null }>({ open: false, accountId: null })

  // Form states
  const [debtForm, setDebtForm] = useState({
    name: "",
    balance: "",
    interestRate: "",
    minimumPayment: "",
    dueDate: "",
  })

  const [creditForm, setCreditForm] = useState({
    name: "",
    balance: "",
    creditLimit: "",
    interestRate: "",
    minimumPayment: "",
    dueDate: "",
  })

  const handleAddDebt = () => {
    if (!debtForm.name || !debtForm.balance || !debtForm.interestRate) return

    addDebtAccount({
      name: debtForm.name,
      balance: Number.parseFloat(debtForm.balance),
      interestRate: Number.parseFloat(debtForm.interestRate),
      minimumPayment: Number.parseFloat(debtForm.minimumPayment) || 0,
      dueDate: debtForm.dueDate,
      createdAt: new Date().toISOString(),
    })

    setDebtForm({ name: "", balance: "", interestRate: "", minimumPayment: "", dueDate: "" })
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
    })

    setCreditForm({ name: "", balance: "", creditLimit: "", interestRate: "", minimumPayment: "", dueDate: "" })
    setShowAddDialog(false)
  }

  const handlePayment = async () => {
    const amount = Number.parseFloat(paymentAmount)
    if (amount <= 0 || amount > balance) return

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

  const totalDebt = debtAccounts.reduce((sum, debt) => sum + debt.balance, 0)
  const totalCreditUsed = creditAccounts.reduce((sum, credit) => sum + credit.balance, 0)
  const totalCreditLimit = creditAccounts.reduce((sum, credit) => sum + credit.creditLimit, 0)
  const overallUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Debt & Credit ({debtAccounts.length + creditAccounts.length})
        </h3>
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Total Debt</p>
                <p className="text-lg font-semibold text-red-600 truncate">{formatCurrency(totalDebt, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Credit Used</p>
                <p className="text-lg font-semibold text-blue-600 truncate">{formatCurrency(totalCreditUsed, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${
                  overallUtilization > 70 ? "bg-red-100" : overallUtilization > 30 ? "bg-yellow-100" : "bg-green-100"
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 md:w-5 md:h-5 ${
                    overallUtilization > 70
                      ? "text-red-600"
                      : overallUtilization > 30
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Utilization</p>
                <p
                  className={`text-lg font-semibold truncate ${
                    overallUtilization > 70
                      ? "text-red-600"
                      : overallUtilization > 30
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}
                >
                  {overallUtilization.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debt and Credit Management */}
      <Card>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="debt">Debt Accounts ({debtAccounts.length})</TabsTrigger>
              <TabsTrigger value="credit">Credit Accounts ({creditAccounts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="space-y-4">
              {debtAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Debt Accounts</h3>
                  <p className="text-muted-foreground mb-4">Add debt accounts to track and manage your debts</p>
                  <Button onClick={() => setShowAddDialog(true)}>Add Debt Account</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {debtAccounts.map((debt) => (
                    <Card key={debt.id} className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{debt.name}</h4>
                          <div className="flex items-center gap-2">
                                <Badge variant="destructive">{formatCurrency(debt.balance, userProfile.currency, userProfile.customCurrency)}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                                  onClick={() => deleteDebtAccount(debt.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDebtDetailsDialog({ open: true, accountId: debt.id })}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  {/* eye icon */}
                                  <CreditCard className="w-3 h-3" />
                                </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Interest Rate</p>
                            <p className="font-medium">{debt.interestRate}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Min Payment</p>
                            <p className="font-medium">{formatCurrency(debt.minimumPayment, userProfile.currency, userProfile.customCurrency)}</p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() =>
                            setPaymentDialog({
                              open: true,
                              accountId: debt.id,
                              accountName: debt.name,
                              accountType: "debt",
                            })
                          }
                          disabled={balance <= 0}
                          className="w-full"
                        >
                          <Minus className="w-4 h-4 mr-2" />
                          Make Payment
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="credit" className="space-y-4">
              {creditAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Credit Accounts</h3>
                  <p className="text-muted-foreground mb-4">Add credit accounts to track utilization and payments</p>
                  <Button onClick={() => setShowAddDialog(true)}>Add Credit Account</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {creditAccounts.map((credit) => {
                    const utilization = (credit.balance / credit.creditLimit) * 100
                    const available = credit.creditLimit - credit.balance

                    return (
                      <Card key={credit.id} className="border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{credit.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={utilization > 70 ? "destructive" : utilization > 30 ? "secondary" : "default"}
                              >
                                {utilization.toFixed(1)}% used
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteCreditAccount(credit.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Credit Utilization</span>
                              <span>
                                {formatCurrency(credit.balance, userProfile.currency, userProfile.customCurrency)} / {formatCurrency(credit.creditLimit, userProfile.currency, userProfile.customCurrency)}
                              </span>
                            </div>
                            <Progress value={utilization} className="h-2" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-muted-foreground">Available Credit</p>
                              <p className="font-medium text-green-600">{formatCurrency(available, userProfile.currency, userProfile.customCurrency)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Min Payment</p>
                              <p className="font-medium">{formatCurrency(credit.minimumPayment, userProfile.currency, userProfile.customCurrency)}</p>
                            </div>
                          </div>

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
                            className="w-full"
                          >
                            <Minus className="w-4 h-4 mr-2" />
                            Make Payment
                          </Button>
                        </CardContent>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {activeTab === "debt" ? "Debt" : "Credit"} Account</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="debt">Debt Account</TabsTrigger>
              <TabsTrigger value="credit">Credit Account</TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="space-y-4">
              <div>
                <Label htmlFor="debt-name">Account Name</Label>
                <Input
                  id="debt-name"
                  value={debtForm.name}
                  onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })}
                  placeholder="e.g., Student Loan, Credit Card"
                />
              </div>

              <div>
                <Label htmlFor="debt-balance">Current Balance ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})</Label>
                <Input
                  id="debt-balance"
                  type="number"
                  step="0.01"
                  value={debtForm.balance}
                  onChange={(e) => setDebtForm({ ...debtForm, balance: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="debt-rate">Interest Rate (%)</Label>
                <Input
                  id="debt-rate"
                  type="number"
                  step="0.01"
                  value={debtForm.interestRate}
                  onChange={(e) => setDebtForm({ ...debtForm, interestRate: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="debt-payment">Minimum Payment ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})</Label>
                <Input
                  id="debt-payment"
                  type="number"
                  step="0.01"
                  value={debtForm.minimumPayment}
                  onChange={(e) => setDebtForm({ ...debtForm, minimumPayment: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddDebt} className="flex-1">
                  Add Debt Account
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="credit" className="space-y-4">
              <div>
                <Label htmlFor="credit-name">Account Name</Label>
                <Input
                  id="credit-name"
                  value={creditForm.name}
                  onChange={(e) => setCreditForm({ ...creditForm, name: e.target.value })}
                  placeholder="e.g., Visa Card, Mastercard"
                />
              </div>

              <div>
                <Label htmlFor="credit-balance">Current Balance ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})</Label>
                <Input
                  id="credit-balance"
                  type="number"
                  step="0.01"
                  value={creditForm.balance}
                  onChange={(e) => setCreditForm({ ...creditForm, balance: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="credit-limit">Credit Limit ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})</Label>
                <Input
                  id="credit-limit"
                  type="number"
                  step="0.01"
                  value={creditForm.creditLimit}
                  onChange={(e) => setCreditForm({ ...creditForm, creditLimit: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="credit-rate">Interest Rate (%)</Label>
                <Input
                  id="credit-rate"
                  type="number"
                  step="0.01"
                  value={creditForm.interestRate}
                  onChange={(e) => setCreditForm({ ...creditForm, interestRate: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddCredit} className="flex-1">
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
                    <p className="text-sm text-muted-foreground mb-2">Balance: {formatCurrency(acc?.balance || 0, userProfile.currency, userProfile.customCurrency)}</p>
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-primary" />
              Make Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Payment to:</p>
              <p className="font-semibold">{paymentDialog.accountName}</p>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Available balance: {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPaymentDialog({ open: false, accountId: "", accountName: "", accountType: "debt" })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={
                  !paymentAmount || Number.parseFloat(paymentAmount) <= 0 || Number.parseFloat(paymentAmount) > balance
                }
                className="flex-1"
              >
                Make Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
