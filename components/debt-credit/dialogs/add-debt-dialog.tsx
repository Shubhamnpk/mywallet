import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, AlertTriangle } from "lucide-react"
import { getCurrencySymbol } from "@/lib/utils"
import type { UserProfile } from "@/types/wallet"
import { Badge } from "@/components/ui/badge"

interface AddDebtDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    addDebtDialog: {
        accountId: string
        accountName: string
    }
    setAddDebtDialog: (dialog: any) => void
    amount: string
    setAmount: (amount: string) => void
    onAdd: () => void
    isLoading: boolean
    error: string | null
    userProfile: UserProfile
}

export function AddDebtDialog({
    open,
    onOpenChange,
    addDebtDialog,
    setAddDebtDialog,
    amount,
    setAmount,
    onAdd,
    isLoading,
    error,
    userProfile
}: AddDebtDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-0 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-destructive">
                        <div className="p-2 bg-destructive/10 rounded-full">
                            <Plus className="w-5 h-5" />
                        </div>
                        Increase Debt
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={(e) => { e.preventDefault(); onAdd(); }} className="space-y-6">
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Adding new charge to</p>
                                <p className="font-bold text-lg">{addDebtDialog.accountName}</p>
                            </div>
                            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">
                                Debt Account
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-medium">
                            Amount to Add
                        </Label>

                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">
                                {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                            </span>
                            <Input
                                type="number"
                                required
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="h-14 pl-10 text-2xl font-bold shadow-sm focus-visible:ring-destructive"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-destructive mt-2 p-2 bg-destructive/5 rounded-md border border-destructive/10">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                            This will increase your total outstanding balance.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false)
                                setAddDebtDialog({ ...addDebtDialog, open: false, accountId: "", accountName: "" })
                            }}
                            className="flex-1 h-11 font-medium"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-white shadow-md hover:shadow-xl hover:shadow-destructive/20 transition-all font-semibold text-base"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5 mr-2" />
                                    Confirm Charge
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
