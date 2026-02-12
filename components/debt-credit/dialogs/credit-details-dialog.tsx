import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import type { UserProfile } from "@/types/wallet"

interface CreditDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    accountId: string | null
    creditAccounts: any[]
    transactions: any[]
    userProfile: UserProfile
}

export function CreditDetailsDialog({
    open,
    onOpenChange,
    accountId,
    creditAccounts,
    transactions,
    userProfile
}: CreditDetailsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Credit Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {accountId ? (
                        (() => {
                            const acc = creditAccounts.find((c) => c.id === accountId)
                            const txs = transactions
                                .filter((t: any) => t.accountId === accountId)
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
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
