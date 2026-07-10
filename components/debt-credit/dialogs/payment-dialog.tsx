import { Button } from "@/components/ui/button"
import { AmountInput } from "@/components/ui/amount-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Coins, Percent, Minus, CreditCard, Banknote, HandCoins } from "lucide-react"
import { getCurrencySymbol, formatCurrency } from "@/lib/utils"
import type { UserProfile } from "@/types/wallet"
import { Badge } from "@/components/ui/badge"

interface PaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    paymentDialog: {
        accountId: string
        accountName: string
        accountType: "debt" | "credit"
    }
    setPaymentDialog: (dialog: any) => void
    paymentAmount: string
    setPaymentAmount: (amount: string) => void
    debtAccounts: any[]
    creditAccounts: any[]
    onPayment: () => void
    userProfile: UserProfile
    balance: number
}

export function PaymentDialog({
    open,
    onOpenChange,
    paymentDialog,
    setPaymentDialog,
    paymentAmount,
    setPaymentAmount,
    debtAccounts,
    creditAccounts,
    onPayment,
    userProfile,
    balance
}: PaymentDialogProps) {
    const account = paymentDialog.accountType === 'debt'
        ? debtAccounts.find(a => a.id === paymentDialog.accountId)
        : creditAccounts.find(a => a.id === paymentDialog.accountId)
    const isLending = paymentDialog.accountType === 'debt' && (account as any)?.direction === "lend"
    const isExternalLend = isLending && (account as any)?.source !== "wallet"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-0 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className={`p-2 rounded-full ${isLending ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                            {isLending ? <HandCoins className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                        </div>
                        {isLending ? 'Repayment Received' : paymentDialog.accountType === 'debt' ? 'Repayment of Debt' : 'Credit Card Repayment'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={(e) => { e.preventDefault(); onPayment(); }} className="space-y-6">
                    <div className={`p-4 rounded-xl border ${isLending ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/30 border-border/50'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">{isLending ? 'Receiving from' : 'Paying towards'}</p>
                                <p className="font-bold text-lg text-foreground">{paymentDialog.accountName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={
                                        isLending ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/10' :
                                        paymentDialog.accountType === 'debt' ? 'text-destructive border-destructive/20 bg-destructive/5' :
                                        'text-primary border-primary/20 bg-primary/5'
                                    }>
                                        {isLending ? (isExternalLend ? "Lending (External)" : "Lending") : paymentDialog.accountType === "debt" ? "Debt Account" : "Credit Account"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-background border shadow-sm">
                                {isLending ? (
                                    <HandCoins className="w-5 h-5 text-emerald-600" />
                                ) : paymentDialog.accountType === 'debt' ? (
                                    <Minus className="w-5 h-5 text-destructive" />
                                ) : (
                                    <CreditCard className="w-5 h-5 text-primary" />
                                )}
                            </div>
                        </div>
                        {isExternalLend && (
                            <p className="text-xs text-muted-foreground mt-2">This repayment is recorded in history only. No wallet transaction will be created (external source).</p>
                        )}
                        {isLending && !isExternalLend && (
                            <p className="text-xs text-muted-foreground mt-2">Money will be added back to your wallet automatically.</p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <AmountInput
                                label={isLending ? 'Amount Received' : 'Repayment Amount'}
                                value={paymentAmount}
                                onChange={setPaymentAmount}
                                currencySymbol={getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                required
                                autoFocus
                                className="h-14 text-2xl font-bold shadow-sm focus-visible:ring-emerald-500"
                            />

                            {!isLending && (
                                <div className="flex justify-between items-center text-xs mt-2 px-1">
                                    <span className="text-muted-foreground">Available Wallet Balance</span>
                                    <span className="font-semibold text-primary">
                                        {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Quick Amount Selectors */}
                        <div className="p-1">
                            <Label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Quick Select</Label>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {(() => {
                                    const selectedAccount = paymentDialog.accountType === 'debt'
                                        ? debtAccounts.find(a => a.id === paymentDialog.accountId)
                                        : creditAccounts.find(a => a.id === paymentDialog.accountId);
                                    const currentDebt = selectedAccount?.balance || 0;

                                    return (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-9 text-xs flex gap-1.5 items-center whitespace-nowrap border-dashed border-muted-foreground/30 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/5"
                                                onClick={() => setPaymentAmount(currentDebt.toString())}
                                            >
                                                <Coins className="w-3.5 h-3.5" />
                                                {isLending ? 'Full Amount' : 'Full Balance'}
                                                <span className="opacity-70 font-normal ml-0.5">({formatCurrency(currentDebt, userProfile.currency, userProfile.customCurrency)})</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-9 text-xs flex gap-1.5 items-center border-dashed border-muted-foreground/30 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/5"
                                                onClick={() => setPaymentAmount((currentDebt / 2).toFixed(2))}
                                            >
                                                <Percent className="w-3.5 h-3.5" /> 50%
                                            </Button>
                                            {!isLending && paymentDialog.accountType === 'debt' && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 text-xs flex gap-1.5 items-center border-dashed border-muted-foreground/30 hover:border-primary hover:text-primary hover:bg-primary/5"
                                                    onClick={() => {
                                                        const debt = debtAccounts.find(a => a.id === paymentDialog.accountId);
                                                        const minPay = (debt as any)?.minimumPayment || 0;
                                                        if (minPay > 0) setPaymentAmount(minPay.toString());
                                                    }}
                                                >
                                                    Min Payment
                                                </Button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                     <div className="flex flex-row gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false)
                                setPaymentDialog({ ...paymentDialog, open: false, accountId: "", accountName: "", accountType: "debt" })
                            }}
                            className="flex-1 h-11 font-medium"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className={`flex-1 h-11 shadow-md hover:shadow-xl transition-all text-base font-semibold ${isLending ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
                        >
                            {isLending ? <HandCoins className="w-5 h-5 mr-2" /> : <Banknote className="w-5 h-5 mr-2" />}
                            {isLending ? 'Confirm Repayment Received' : 'Confirm Repayment'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
