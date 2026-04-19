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
import { Clock, Calendar, Tag, FileText, TrendingUp, TrendingDown, Trash2, Pencil } from "lucide-react"
import type { Category, Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
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
  if (t.allocationType === "credit" || t.allocationType === "debt" || t.allocationType === "fastdebt") return false
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
                    transaction.status === "debt" || transaction.status === "repayment"
                      ? (transaction.total ?? transaction.amount)
                      : (transaction.actual ?? transaction.amount),
                    userProfile.currency,
                    userProfile.customCurrency,
                  )}
                </p>

                {transaction.type === "expense" && (
                  <TimeTooltip amount={transaction.actual ?? transaction.amount}>
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeEquivalentDisplay(transaction.actual ?? transaction.amount)} of work</span>
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

                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="secondary">{transaction.category}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(transaction.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {(transaction.status === "debt" ||
                  (transaction.debtUsed ?? 0) > 0 ||
                  Boolean(transaction.debtAccountId)) && (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400"
                    >
                      Debt Transaction
                    </Badge>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Breakdown</p>
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
                              transaction.actual ?? transaction.amount,
                              userProfile.currency,
                              userProfile.customCurrency,
                            )}
                          </span>
                        </div>
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
                  </div>
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

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} className="flex-1 min-w-[6rem] bg-transparent">
              Close
            </Button>
            {editable && !isEditing && (
              <Button type="button" variant="secondary" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            )}
            {editable && isEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    syncFormFromTransaction(transaction)
                    setIsEditing(false)
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => void handleSaveEdit()} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
            {onDelete && (
              <Button variant="destructive" onClick={handleDelete} className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
          {!editable && (
            <p className="text-xs text-muted-foreground">
              Debt- and credit-linked rows cannot be edited here without breaking linked balances. Delete and re-add if you
              need to correct one.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
