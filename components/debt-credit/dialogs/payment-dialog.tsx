import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Coins, Percent, Minus, CreditCard, Banknote } from "lucide-react"
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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-0 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className="p-2 bg-primary/10 text-primary rounded-full">
                            <Banknote className="w-5 h-5" />
                        </div>
                        {paymentDialog.accountType === 'debt' ? 'Repayment of Debt' : 'Credit Card Repayment'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={(e) => { e.preventDefault(); onPayment(); }} className="space-y-6">
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Paying towards</p>
                                <p className="font-bold text-lg text-foreground">{paymentDialog.accountName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={`${paymentDialog.accountType === 'debt' ? 'text-destructive border-destructive/20 bg-destructive/5' : 'text-primary border-primary/20 bg-primary/5'}`}>
                                        {paymentDialog.accountType === "debt" ? "Debt Account" : "Credit Account"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-background border shadow-sm">
                                {paymentDialog.accountType === 'debt' ? (
                                    <Minus className="w-5 h-5 text-destructive" />
                                ) : (
                                    <CreditCard className="w-5 h-5 text-primary" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium mb-1.5 block">
                                Repayment Amount
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
                                    max={balance}
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="h-14 pl-10 text-2xl font-bold shadow-sm focus-visible:ring-primary"
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-between items-center text-xs mt-2 px-1">
                                <span className="text-muted-foreground">Available Wallet Balance</span>
                                <span className="font-semibold text-primary">
                                    {formatCurrency(balance, userProfile.currency, userProfile.customCurrency)}
                                </span>
                            </div>
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
                                                className="h-9 text-xs flex gap-1.5 items-center whitespace-nowrap border-dashed border-muted-foreground/30 hover:border-primary hover:text-primary hover:bg-primary/5"
                                                onClick={() => setPaymentAmount(currentDebt.toString())}
                                            >
                                                <Coins className="w-3.5 h-3.5" />
                                                Full Balance
                                                <span className="opacity-70 font-normal ml-0.5">({formatCurrency(currentDebt, userProfile.currency, userProfile.customCurrency)})</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-9 text-xs flex gap-1.5 items-center border-dashed border-muted-foreground/30 hover:border-primary hover:text-primary hover:bg-primary/5"
                                                onClick={() => setPaymentAmount((currentDebt / 2).toFixed(2))}
                                            >
                                                <Percent className="w-3.5 h-3.5" /> 50%
                                            </Button>
                                            {paymentDialog.accountType === 'debt' && (
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
                            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-xl hover:shadow-primary/20 transition-all text-base font-semibold"
                        >
                            <Banknote className="w-5 h-5 mr-2" />
                            Confirm Repayment
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
