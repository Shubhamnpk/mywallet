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
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-primary/20 shadow-2xl rounded-3xl overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2 border-b border-border/40">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl shadow-inner border border-white/10",
              riskLevel === "medium"
                ? "bg-gradient-to-br from-amber-500/20 to-amber-600/5 text-amber-600"
                : "bg-gradient-to-br from-red-500/20 to-red-600/5 text-red-600"
            )}>
              {riskLevel === "medium" ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-foreground">Delete Category</DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground">
                This action requires your confirmation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Category Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-2xl">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-black/5"
              style={{ backgroundColor: category.color }}
            >
              <span className="drop-shadow-sm">{category.icon || "📦"}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg leading-none mb-1">{category.name}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest bg-background/50 border border-border/50">
                  {category.type}
                </Badge>
                {category.isDefault && (
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                    Default
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Impact Analysis</label>

            {riskLevel === "medium" && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-700 text-sm">
                      Category In Use
                    </p>
                    <p className="text-xs text-amber-600/90 leading-relaxed font-medium">
                      This category is currently linked to <span className="font-black">{categoryTransactions.length}</span> transaction{categoryTransactions.length !== 1 ? 's' : ''}.
                      <br />
                      <span className="opacity-80">Deleting it will not remove the transactions, but they will become "Uncategorized".</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {riskLevel === "low" && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-blue-700 text-sm">
                      Safe to Delete
                    </p>
                    <p className="text-xs text-blue-600/90 leading-relaxed font-medium">
                      This category has no associated transactions and can be safely removed from your wallet.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-2 border-t border-border/40 bg-muted/20">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl font-bold border-border/60 hover:bg-background"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-destructive/20 hover:bg-destructive/90 active:scale-[0.98] transition-all"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Deleting...
                </div>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirm Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}