import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { getTimeSinceCreation, calculateInterest } from "../debt-credit-utils"
import type { UserProfile } from "@/types/wallet"

interface DebtDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    accountId: string | null
    debtAccounts: any[]
    transactions: any[]
    userProfile: UserProfile
}

export function DebtDetailsDialog({
    open,
    onOpenChange,
    accountId,
    debtAccounts,
    transactions,
    userProfile
}: DebtDetailsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Debt Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {accountId ? (
                        (() => {
                            const acc = debtAccounts.find((d) => d.id === accountId)
                            const txs = transactions
                                .filter((t: any) => t.accountId === accountId)
                                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

                            return (
                                <div>
                                    <h4 className="font-semibold mb-2">{acc?.name}</h4>
                                    <div className="space-y-2 mb-4">
                                        <p className="text-sm text-muted-foreground">Principal: {formatCurrency(acc?.balance || 0, userProfile.currency, userProfile.customCurrency)}</p>
                                        {(() => {
                                            const isFastDebt = acc?.isFastDebt
                                            const timeElapsed = isFastDebt ? 0 : getTimeSinceCreation(acc?.createdAt || new Date().toISOString())
                                            const accruedInterest = isFastDebt ? 0 : calculateInterest(
                                                acc?.balance || 0,
                                                acc?.interestRate || 0,
                                                timeElapsed,
                                                (acc as any)?.interestFrequency || 'yearly',
                                                (acc as any)?.interestType || 'simple'
                                            )
                                            const totalWithInterest = (acc?.balance || 0) + accruedInterest

                                            return (
                                                <>
                                                    {isFastDebt ? (
                                                        <p className="text-sm text-muted-foreground">Fast Debt - No interest accrued</p>
                                                    ) : (
                                                        accruedInterest > 0 && (
                                                            <>
                                                                <p className="text-sm text-muted-foreground">Accrued Interest: {formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}</p>
                                                                <p className="text-sm font-medium text-destructive">Total Balance: {formatCurrency(totalWithInterest, userProfile.currency, userProfile.customCurrency)}</p>
                                                            </>
                                                        )
                                                    )}
                                                    {!isFastDebt && (
                                                        <div className="text-xs text-muted-foreground mt-2">
                                                            <p>Interest Rate: {acc?.interestRate}% ({(acc as any)?.interestFrequency || 'yearly'})</p>
                                                            <p>Type: {(acc as any)?.interestType === 'simple' ? 'Simple Interest' : 'Compound Interest'}</p>
                                                            <p>Time Elapsed: {timeElapsed.toFixed(2)} years</p>
                                                        </div>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>
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
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
