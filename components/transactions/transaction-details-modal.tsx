"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import { useState } from "react"
import { Clock, Calendar, Tag, FileText, TrendingUp, TrendingDown, Trash2, Scissors } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"

interface TransactionDetailsModalProps {
  transaction: Transaction
  userProfile: UserProfile
  isOpen: boolean
  onClose: () => void
  onDelete?: (id: string) => void
  onCreatePartial?: (transaction: Transaction, amount: number, customDate?: string) => Promise<boolean> | boolean
}

export function TransactionDetailsModal({
  transaction,
  userProfile,
  isOpen,
  onClose,
  onDelete,
  onCreatePartial,
}: TransactionDetailsModalProps) {
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [partialAmount, setPartialAmount] = useState("")
  const [customDate, setCustomDate] = useState(new Date().toISOString().split("T")[0])

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

  const handleCreatePartial = async () => {
    if (!onCreatePartial) return
    const amount = Number.parseFloat(partialAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    await onCreatePartial(transaction, amount, customDate)
    setPartialAmount("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          {/* Amount */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Amount</p>
            <p className={`text-2xl font-bold ${transaction.type === "income" ? "text-primary" : "text-red-600"}`}>
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(
                (transaction.status === "debt" || transaction.status === "repayment")
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

          {/* Details */}
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

            {(
              transaction.status === "debt" ||
              ((transaction.debtUsed ?? 0) > 0) ||
              Boolean(transaction.debtAccountId)
            ) && (
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
                        Total: {formatCurrency(
                          transaction.total ?? transaction.amount,
                          userProfile.currency,
                          userProfile.customCurrency
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">
                        Cash: {formatCurrency(
                          transaction.actual ?? transaction.amount,
                          userProfile.currency,
                          userProfile.customCurrency
                        )}
                      </span>
                    </div>
                    {(transaction.debtUsed ?? 0) > 0 && (
                      <div className="text-orange-600 dark:text-orange-400">
                        Debt: {formatCurrency(
                          transaction.debtUsed ?? 0,
                          userProfile.currency,
                          userProfile.customCurrency
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}            {transaction.status === "repayment" && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-400">
                  Debt Repayment
                </Badge>
                <div>
                  <p className="text-sm text-muted-foreground">Repayment Details</p>
                  <div className="text-sm">
                    <span className="font-medium">Amount: {formatCurrency(transaction.total ?? transaction.amount, userProfile.currency, userProfile.customCurrency)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">More Details</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreDetails((prev) => !prev)}
              >
                {showMoreDetails ? "Hide" : "Show"}
              </Button>
            </div>
            {showMoreDetails && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Optional tools for this transaction. Use only when needed.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create a partial transaction from this one and optionally set a custom date.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Partial amount"
                    disabled={!onCreatePartial}
                  />
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    disabled={!onCreatePartial}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreatePartial}
                    disabled={!onCreatePartial || !partialAmount}
                    className="flex items-center gap-2"
                  >
                    <Scissors className="w-4 h-4" />
                    Create Partial Transaction
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Close
            </Button>
            {onDelete && (
              <Button variant="destructive" onClick={handleDelete} className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
