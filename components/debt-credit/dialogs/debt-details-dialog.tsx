"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { getTimeSinceCreation, calculateInterest } from "../debt-credit-utils"
import type { UserProfile } from "@/types/wallet"
import { Receipt, TrendingDown, TrendingUp, CreditCard, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAppDate, getCalendarMonthRange, getCalendarSystem } from "@/lib/app-calendar"

interface DebtDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    accountId: string | null
    debtAccounts: any[]
    transactions: any[]
    userProfile: UserProfile
}

type HistoryRange = "active-month" | "this-week" | "all"

export function DebtDetailsDialog({
    open,
    onOpenChange,
    accountId,
    debtAccounts,
    transactions,
    userProfile
}: DebtDetailsDialogProps) {
    const [historyRange, setHistoryRange] = useState<HistoryRange>("active-month")
    const calendarSystem = getCalendarSystem(userProfile.calendarSystem)

    const getPeriodRange = (range: HistoryRange) => {
        const now = new Date()
        if (range === "this-week") {
            const day = now.getDay()
            const diff = now.getDate() - day + (day === 0 ? -6 : 1)
            const start = new Date(now.getFullYear(), now.getMonth(), diff)
            const end = new Date(start)
            end.setDate(end.getDate() + 7)
            return { start, end }
        }
        if (range === "active-month") {
            return getCalendarMonthRange(now, calendarSystem)
        }
        return { start: new Date(0), end: new Date(8640000000000000) }
    }

    const account = useMemo(() => {
        if (!accountId) return null
        return debtAccounts.find((d) => d.id === accountId)
    }, [accountId, debtAccounts])

    const accountTransactions = useMemo(() => {
        if (!accountId) return []
        return transactions
            .filter((t: any) => t.accountId === accountId || t.debtAccountId === accountId)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [accountId, transactions])

    const filteredTransactions = useMemo(() => {
        if (historyRange === "all") return accountTransactions
        const { start, end } = getPeriodRange(historyRange)
        return accountTransactions.filter((t: any) => {
            const time = new Date(t.date).getTime()
            return time >= start.getTime() && time < end.getTime()
        })
    }, [accountTransactions, historyRange, calendarSystem])

    const paymentTotal = useMemo(() => {
        return filteredTransactions
            .filter((t: any) => t.type === "payment")
            .reduce((sum: number, t: any) => sum + t.amount, 0)
    }, [filteredTransactions])

    const chargeTotal = useMemo(() => {
        return filteredTransactions
            .filter((t: any) => t.type === "charge")
            .reduce((sum: number, t: any) => sum + t.amount, 0)
    }, [filteredTransactions])

    const getTransactionMeta = (tx: any) => {
        if (tx.type === "payment") {
            return {
                badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
                label: "Payment",
                signedAmount: `-${formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency)}`,
                signedAmountClassName: "text-emerald-600",
                icon: TrendingDown,
            }
        }
        if (tx.type === "charge") {
            return {
                badgeClassName: "border-red-200 bg-red-50 text-red-700",
                label: "Charge",
                signedAmount: `+${formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency)}`,
                signedAmountClassName: "text-red-600",
                icon: TrendingUp,
            }
        }
        return {
            badgeClassName: "border-muted-foreground/20 bg-muted text-muted-foreground",
            label: "Other",
            signedAmount: formatCurrency(tx.amount, userProfile.currency, userProfile.customCurrency),
            signedAmountClassName: "text-foreground",
            icon: FileText,
        }
    }

    const isFastDebt = account?.isFastDebt
    const timeElapsed = isFastDebt ? 0 : getTimeSinceCreation(account?.createdAt || new Date().toISOString())
    const accruedInterest = isFastDebt ? 0 : calculateInterest(
        account?.balance || 0,
        account?.interestRate || 0,
        timeElapsed,
        account?.interestFrequency || 'yearly',
        account?.interestType || 'simple'
    )
    const totalWithInterest = (account?.balance || 0) + accruedInterest

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[85vh] max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
                <DialogHeader className="shrink-0 p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Receipt className="w-5 h-5 text-primary" />
                        {account?.name || "Debt"} Transactions
                    </DialogTitle>
                </DialogHeader>

                {account && (
                    <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden p-6 pt-4">
                        {/* Stats Summary */}
                        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Stats Summary</span>
                                <div className="flex items-center gap-4">
                                    <div className="text-xs">
                                        <span className="text-muted-foreground">Entries: </span>
                                        <span className="font-bold">{filteredTransactions.length}</span>
                                    </div>
                                    <div className="text-xs text-emerald-600">
                                        <span className="text-muted-foreground">Payments: </span>
                                        <span className="font-bold">-{formatCurrency(paymentTotal, userProfile.currency, userProfile.customCurrency)}</span>
                                    </div>
                                    <div className="text-xs text-red-600">
                                        <span className="text-muted-foreground">Charges: </span>
                                        <span className="font-bold">+{formatCurrency(chargeTotal, userProfile.currency, userProfile.customCurrency)}</span>
                                    </div>
                                </div>
                            </div>

                            <Select
                                value={historyRange}
                                onValueChange={(value: HistoryRange) => setHistoryRange(value)}
                            >
                                <SelectTrigger className="w-[170px] bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active-month">Active Month</SelectItem>
                                    <SelectItem value="this-week">This Week</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Account Info Card */}
                        <div className="shrink-0 grid grid-cols-2 gap-4">
                            <div className="rounded-xl border bg-background p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Balance</span>
                                </div>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(account.balance || 0, userProfile.currency, userProfile.customCurrency)}
                                </p>
                            </div>
                            <div className="rounded-xl border bg-background p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                        {isFastDebt ? "Type" : "Accrued Interest"}
                                    </span>
                                </div>
                                <p className={cn("text-2xl font-bold", isFastDebt ? "text-amber-600" : "text-amber-600")}>
                                    {isFastDebt ? "Fast Debt" : formatCurrency(accruedInterest, userProfile.currency, userProfile.customCurrency)}
                                </p>
                            </div>
                        </div>

                        {/* Interest Details */}
                        {!isFastDebt && (
                            <div className="shrink-0 rounded-xl border bg-muted/20 p-3 text-sm">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                                    <span>Interest Rate: <span className="font-medium text-foreground">{account.interestRate}%</span></span>
                                    <span>Frequency: <span className="font-medium text-foreground">{account.interestFrequency || 'yearly'}</span></span>
                                    <span>Type: <span className="font-medium text-foreground">{account.interestType === 'simple' ? 'Simple' : 'Compound'}</span></span>
                                    {accruedInterest > 0 && (
                                        <span className="text-destructive font-medium">
                                            Total with Interest: {formatCurrency(totalWithInterest, userProfile.currency, userProfile.customCurrency)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Transaction List */}
                        <div className="flex min-h-0 flex-1 flex-col pt-2">
                            <h4 className="mb-2 shrink-0 text-sm font-medium text-muted-foreground">Transaction Details</h4>
                            {filteredTransactions.length === 0 ? (
                                <div className="flex-1 rounded-xl border border-dashed flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground bg-muted/5">
                                    <Receipt className="w-10 h-10 mb-2 opacity-20" />
                                    No transactions found for this period.
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-2 [-webkit-overflow-scrolling:touch] scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                                    {filteredTransactions.map((tx: any) => {
                                        const meta = getTransactionMeta(tx)
                                        const Icon = meta.icon

                                        return (
                                            <div key={tx.id} className="group rounded-xl border bg-background p-4 hover:shadow-md transition-all duration-200 hover:border-primary/20">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-tighter py-0 px-1.5", meta.badgeClassName)}>
                                                                {meta.label}
                                                            </Badge>
                                                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter bg-muted px-1.5 py-0.5 rounded">
                                                                {formatAppDate(tx.date, calendarSystem)}
                                                            </span>
                                                        </div>
                                                        <p className="font-semibold text-sm leading-tight text-foreground/90 group-hover:text-foreground transition-colors">
                                                            {tx.description || `${meta.label} Transaction`}
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-muted-foreground font-medium">
                                                            Balance After: {formatCurrency(tx.balanceAfter, userProfile.currency, userProfile.customCurrency)}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className={cn("text-base font-bold", meta.signedAmountClassName)}>
                                                            {meta.signedAmount}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!account && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select a debt account to view details.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
