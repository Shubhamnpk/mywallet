"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Trash2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Category, Transaction } from "@/types/wallet"

interface DeleteCategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  category: Category | null
  transactions: Transaction[]
  onConfirmDelete: (categoryId: string) => void
}

export function DeleteCategoryDialog({
  isOpen,
  onClose,
  category,
  transactions,
  onConfirmDelete
}: DeleteCategoryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!category) return null

  // Check if category is being used
  const categoryTransactions = transactions.filter(t => t.category === category.name)
  const isInUse = categoryTransactions.length > 0
  const isDefault = category.isDefault

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onConfirmDelete(category.id)
      onClose()
    } catch (error) {
      console.error("Failed to delete category:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getRiskLevel = () => {
    if (isInUse) return "medium"
    return "low"
  }

  const riskLevel = getRiskLevel()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              riskLevel === "medium" ? "bg-amber-100 dark:bg-amber-900/20" :
              "bg-blue-100 dark:bg-blue-900/20"
            )}>
              {riskLevel === "medium" ? (
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              ) : (
                <Trash2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Delete Category
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Are you sure you want to delete this category?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Preview */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shadow-sm"
              style={{ backgroundColor: category.color }}
            >
              {category.icon || "📦"}
            </div>
            <div className="flex-1">
              <p className="font-medium">{category.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {category.type}
                </Badge>
                {category.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          {riskLevel === "medium" && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Category In Use
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    This category is used in <strong>{categoryTransactions.length}</strong> transaction{categoryTransactions.length !== 1 ? 's' : ''}.
                    Deleting it will not remove the transactions, but they will be categorized as "Uncategorized".
                  </p>
                </div>
              </div>
            </div>
          )}

          {riskLevel === "low" && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Safe to Delete
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This category is not being used in any transactions and can be safely deleted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </div>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Category
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}