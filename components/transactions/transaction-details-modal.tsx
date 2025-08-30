"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import { Clock, Calendar, Tag, FileText, TrendingUp, TrendingDown, Trash2 } from "lucide-react"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface TransactionDetailsModalProps {
  transaction: Transaction
  userProfile: UserProfile
  isOpen: boolean
  onClose: () => void
  onDelete?: (id: string) => void
}

export function TransactionDetailsModal({
  transaction,
  userProfile,
  isOpen,
  onClose,
  onDelete,
}: TransactionDetailsModalProps) {
  const formatTimeEquivalent = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(transaction.id)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transaction.type === "income" ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
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
            <p className={`text-2xl font-bold ${transaction.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount, userProfile.currency)}
            </p>

            {transaction.timeEquivalent && (
              <TimeTooltip amount={transaction.amount}>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeEquivalent(transaction.timeEquivalent)} of work</span>
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
          </div>

          <Separator />

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
