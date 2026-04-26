"use client"

import { useEffect, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AmountInput } from "@/components/ui/amount-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Calendar, Tag, FileText, TrendingUp, TrendingDown, Trash2, Pencil, ChevronDown, ArrowRightLeft } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import type { Category, Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { useWalletData } from "@/hooks/use-wallet-data"
import { toast } from "sonner"

function toDateInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function canEditTransaction(t: Transaction) {
  if (t.status === "repayment" || t.status === "debt") return false
  if (
    t.allocationType === "credit" ||
    t.allocationType === "debt" ||
    t.allocationType === "fastdebt" ||
    t.allocationType === "debt_loan"
  ) return false
  return true
}

interface TransactionDetailsModalProps {
  transaction: Transaction
  userProfile: UserProfile
  categories: Category[]
  isOpen: boolean
  onClose: () => void
  onDelete?: (id: string) => void
  updateTransaction: (
    id: string,
    updates: Partial<Pick<Transaction, "amount" | "description" | "category" | "date" | "subcategory">>,
  ) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>
  onSaved?: (transaction: Transaction) => void
}

export function TransactionDetailsModal({
  transaction,
  userProfile,
  categories,
  isOpen,
  onClose,
  onDelete,
  updateTransaction,
  onSaved,
}: TransactionDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formAmount, setFormAmount] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formSubcategory, setFormSubcategory] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { goals, debtAccounts } = useWalletData()

  const syncFormFromTransaction = useCallback((t: Transaction) => {
    setFormAmount(String(t.amount))
    setFormDescription(t.description)
    setFormCategory(t.category)
    setFormDate(toDateInputValue(t.date))
    setFormSubcategory(t.subcategory ?? "")
  }, [])

  useEffect(() => {
    syncFormFromTransaction(transaction)
    setIsEditing(false)
  }, [transaction, syncFormFromTransaction])

  const getTimeEquivalentDisplay = (amount: number) => {
    const breakdown = getTimeEquivalentBreakdown(amount, userProfile)
    return breakdown ? breakdown.formatted.userFriendly : ""
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(transaction.id)
      onClose()
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setIsEditing(false)
      onClose()
    }
  }

  const categoryNames = Array.from(
    new Set(
      categories
        .filter((c) => c.type === transaction.type)
        .map((c) => c.name.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b))

  if (!categoryNames.includes(transaction.category)) {
    categoryNames.push(transaction.category)
    categoryNames.sort((a, b) => a.localeCompare(b))
  }

  const handleSaveEdit = async () => {
    if (!editable) {
      toast.error("This linked transaction cannot be edited here")
      setIsEditing(false)
      return
    }

    const num = Number.parseFloat(formAmount)
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    setIsSaving(true)
    try {
      const result = await updateTransaction(transaction.id, {
        amount: num,
        description: formDescription.trim(),
        category: formCategory.trim(),
        date: formDate,
        subcategory: formSubcategory.trim() || undefined,
      })
      if (!result.success || !result.transaction) {
        toast.error(result.error || "Could not update transaction")
        return
      }
      toast.success("Transaction updated")
      setIsEditing(false)
      onSaved?.(result.transaction)
    } finally {
      setIsSaving(false)
    }
  }

  const editable = canEditTransaction(transaction)

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transaction.type === "income" ? (
              <TrendingUp className="w-5 h-5 text-primary" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing ? (
            <>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Amount</p>
                <p className={`text-2xl font-bold ${transaction.type === "income" ? "text-primary" : "text-red-600"}`}>
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(
                    transaction.amount,
                    userProfile.currency,
                    userProfile.customCurrency,
                  )}
                </p>

                {transaction.type === "expense" && userProfile.hourlyRate > 0 && (
                  <TimeTooltip amount={transaction.amount}>
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeEquivalentDisplay(transaction.amount)} of work</span>
                    </div>
                  </TimeTooltip>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{transaction.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-muted-foreground">Date:</p>
                      <p className="font-medium">
                        {new Date(transaction.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-muted-foreground">Category:</p>
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </div>
                  </div>
                </div>

                {/* Payment Source Breakdown - shows for debt or goal transactions where actual < amount */}
                {((transaction.status === "debt" ||
                  (transaction.debtUsed ?? 0) > 0 ||
                  Boolean(transaction.debtAccountId)) ||
                  (transaction.allocationType === "goal" && (transaction.actual ?? 0) < transaction.amount)) && (
                  <Collapsible defaultOpen={false}>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={transaction.allocationType === "goal"
                          ? "border-primary text-primary"
                          : "border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400"}
                      >
                        {transaction.allocationType === "goal" ? "Goal Payment" : "Debt Transaction"}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium">
                          View Breakdown
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-2 pl-11">
                        <p className="text-sm text-muted-foreground mb-1">Payment Breakdown</p>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">
                              Total:{" "}
                              {formatCurrency(
                                transaction.total ?? transaction.amount,
                                userProfile.currency,
                                userProfile.customCurrency,
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">
                              Cash:{" "}
                              {formatCurrency(
                                transaction.actual ?? 0,
                                userProfile.currency,
                                userProfile.customCurrency,
                              )}
                            </span>
                          </div>
                          {/* Goal amount breakdown */}
                          {transaction.allocationType === "goal" && (
                            <div className="text-primary">
                              Goal:{" "}
                              {formatCurrency(
                                transaction.amount - (transaction.actual ?? 0),
                                userProfile.currency,
                                userProfile.customCurrency,
                              )}
                            </div>
                          )}
                          {/* Debt amount breakdown */}
                          {(transaction.debtUsed ?? 0) > 0 && (
                            <div className="text-orange-600 dark:text-orange-400">
                              Debt:{" "}
                              {formatCurrency(
                                transaction.debtUsed ?? 0,
                                userProfile.currency,
                                userProfile.customCurrency,
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {transaction.status === "repayment" && (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-400"
                    >
                      Debt Repayment
                    </Badge>
                    <div>
                      <p className="text-sm text-muted-foreground">Repayment Details</p>
                      <div className="text-sm">
                        <span className="font-medium">
                          Amount:{" "}
                          {formatCurrency(
                            transaction.total ?? transaction.amount,
                            userProfile.currency,
                            userProfile.customCurrency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Goal/Debt Transfer Breakdown */}
                {(transaction.allocationType === "goal_transfer" || transaction.allocationType === "debt_loan") && (
                  <Collapsible className="rounded-xl border border-primary/20 bg-primary/5">
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-sm hover:bg-primary/10 rounded-t-xl [&[data-state=open]>svg]:rotate-180">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-primary" />
                        <span className="font-medium text-primary">Transfer Details</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-primary transition-transform duration-200" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 pt-0 space-y-2">
                      {/* Get account name */}
                      {(() => {
                        const account = transaction.allocationType === "goal_transfer"
                          ? goals.find(g => g.id === transaction.allocationTarget)
                          : debtAccounts?.find(d => d.id === transaction.allocationTarget)
                        const accountName = account
                          ? ('title' in account ? account.title : account.name) || account.id
                          : "Unknown Account"
                        return (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">From:</span>
                              <span className="font-medium flex items-center gap-1">
                                {transaction.allocationType === "goal_transfer" ? "🎯" : "💳"} {accountName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">To:</span>
                              <span className="font-medium">Main Balance</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Amount:</span>
                              <span className="font-medium text-primary">
                                {formatCurrency(transaction.amount, userProfile.currency, userProfile.customCurrency)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-primary/10">
                              {transaction.allocationType === "goal_transfer"
                                ? `Money transferred from "${accountName}" goal to your main balance`
                                : `Money borrowed from "${accountName}" debt account to your main balance`}
                            </div>
                          </>
                        )
                      })()}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <AmountInput
                id="tx-edit-amount"
                label="Amount"
                value={formAmount}
                onChange={setFormAmount}
                currencySymbol={getCurrencySymbol(userProfile.currency, userProfile.customCurrency)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tx-edit-date">Date</Label>
                  <Input id="tx-edit-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tx-edit-sub">Subcategory (optional)</Label>
                <Input
                  id="tx-edit-sub"
                  value={formSubcategory}
                  onChange={(e) => setFormSubcategory(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tx-edit-description">Description</Label>
                <Input
                  id="tx-edit-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Footer Buttons */}
          {!isEditing ? (
            /* View Mode: Edit and Delete side by side, full width */
            <div className={`grid gap-3 ${editable ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {editable && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              )}
              {/* Only show Delete here if editable - otherwise show in non-editable section below */}
              {editable && onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              )}
            </div>
          ) : (
            /* Edit Mode: Cancel and Save side by side, full width */
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  syncFormFromTransaction(transaction)
                  setIsEditing(false)
                }}
                disabled={isSaving}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}

          {/* Non-editable transactions - Full width Delete button */}
          {!editable && onDelete && (
            <div className="space-y-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 w-full"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Debt-, credit-, and debt-loan-linked rows cannot be edited here without breaking linked balances. Delete and
                re-add if you need to correct one.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
