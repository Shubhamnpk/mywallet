"use client"

import { PortfolioItem } from "@/types/wallet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Activity, BarChart3, TrendingDown, TrendingUp, Calendar, Info, Clock, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useState } from "react"

type ProposedDividendRecord = {
    id: number
    symbol: string
    company_name: string
    cash_dividend?: string
    bonus_share?: string
    fiscal_year?: string
    announcement_date?: string
    scraped_at?: string
}

interface StockDetailModalProps {
    item: PortfolioItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function StockDetailModal({ item, open, onOpenChange }: StockDetailModalProps) {
    const { scripNamesMap } = useWalletData()
    const [showDividendHistory, setShowDividendHistory] = useState(false)
    const [isDividendHistoryLoading, setIsDividendHistoryLoading] = useState(false)
    const [dividendHistoryError, setDividendHistoryError] = useState<string | null>(null)
    const [dividendHistory, setDividendHistory] = useState<ProposedDividendRecord[] | null>(null)
    const current = item?.currentPrice || item?.buyPrice || 0
    const investment = (item?.units || 0) * (item?.buyPrice || 0)
    const value = (item?.units || 0) * current
    const profitLoss = value - investment
    const profitLossPerc = investment > 0 ? (profitLoss / investment) * 100 : 0
    const isProfit = profitLoss >= 0

    const dailyChange = item?.change || (item?.currentPrice && item?.previousClose ? item?.currentPrice - item?.previousClose : 0)
    const dailyChangePerc = item?.percentChange || (item?.previousClose ? (dailyChange / item?.previousClose) * 100 : 0)
    const isDailyProfit = dailyChange >= 0
    const companyName = item ? (scripNamesMap[item.symbol.trim().toUpperCase()] || "") : ""

    const parsePositiveNumber = (value?: string) => {
        if (!value) return 0
        const parsed = Number.parseFloat(value.replace(/,/g, "").trim())
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
    }

    const normalizeCompany = (value?: string) =>
        (value || "")
            .toLowerCase()
            .replace(/\b(limited|ltd|public|private|pvt|co|company|inc)\b/g, "")
            .replace(/[().,-]/g, "")
            .replace(/\s+/g, " ")
            .trim()

    const loadDividendHistory = async () => {
        if (dividendHistory || isDividendHistoryLoading) return
        setIsDividendHistoryLoading(true)
        setDividendHistoryError(null)
        try {
            const response = await fetch("/api/nepse/proposed-dividend/history-all-years")
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || "Failed to fetch dividend history")
            }
            if (!Array.isArray(data)) {
                throw new Error("Dividend history response was invalid")
            }
            setDividendHistory(data as ProposedDividendRecord[])
        } catch (error: any) {
            setDividendHistoryError(error?.message || "Could not load dividend history right now.")
        } finally {
            setIsDividendHistoryLoading(false)
        }
    }

    const symbol = item?.symbol?.trim().toUpperCase() || ""
    const normalizedHoldingName = normalizeCompany(companyName)
    const matchedDividendHistory = (dividendHistory || [])
        .filter((record) => {
            const recordSymbol = record.symbol?.trim().toUpperCase() || ""
            if (symbol && recordSymbol === symbol) return true
            const recordName = normalizeCompany(record.company_name)
            return Boolean(normalizedHoldingName && recordName && (recordName.includes(normalizedHoldingName) || normalizedHoldingName.includes(recordName)))
        })
        .sort((a, b) => {
            const aDate = new Date(a.announcement_date || a.scraped_at || 0).getTime()
            const bDate = new Date(b.announcement_date || b.scraped_at || 0).getTime()
            return bDate - aDate
        })

    const latestDividend = matchedDividendHistory[0]
    const latestCashPercent = parsePositiveNumber(latestDividend?.cash_dividend)
    const latestBonusPercent = parsePositiveNumber(latestDividend?.bonus_share)
    const heldUnits = item?.units || 0
    const estimatedCashAmount = latestCashPercent * heldUnits
    const estimatedBonusUnits = (latestBonusPercent / 100) * heldUnits

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {item && (
                <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh] sm:max-h-[90vh]" showCloseButton={false}>
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-all z-50 border border-muted-foreground/10"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center justify-between mb-2 pr-8">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                                Stock Details
                            </Badge>
                            {item.lastUpdated && (
                                <div className="flex items-center gap-1.5 grayscale opacity-60">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">
                                        Synced {new Date(item.lastUpdated).toLocaleTimeString()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <DialogTitle className="text-3xl font-black tracking-tight flex items-center flex-wrap gap-2">
                                    {item.symbol}
                                    <Badge className="bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest border-none">
                                        {item.sector || "Others"}
                                    </Badge>
                                </DialogTitle>
                                {companyName && (
                                    <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mt-0.5 line-clamp-1">
                                        {companyName}
                                    </p>
                                )}
                                <DialogDescription className="text-sm font-medium mt-1">
                                    {item.units} Units Held in Portfolio
                                </DialogDescription>
                            </div>
                            <div className="text-right ml-4">
                                <div className="text-2xl font-black font-mono">
                                    रु {current.toLocaleString()}
                                </div>
                                <div className={cn(
                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                                    isDailyProfit ? "text-green-600 bg-green-500/10" : "text-red-600 bg-red-500/10"
                                )}>
                                    {isDailyProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 pt-2 space-y-6 flex-1 overflow-y-auto show-scrollbars">
                        {/* Performance Card */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-muted/30 border border-muted/50 flex flex-col gap-1">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Current Value</span>
                                <span className="text-lg font-black font-mono">रु {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className={cn(
                                "p-4 rounded-2xl border flex flex-col gap-1",
                                isProfit ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10"
                            )}>
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total P/L</span>
                                <span className={cn(
                                    "text-lg font-black font-mono",
                                    isProfit ? "text-green-600" : "text-red-600"
                                )}>
                                    {isProfit ? "+" : ""}{profitLossPerc.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Market Data */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-muted/50">
                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                    <TrendingUp className="w-2.5 h-2.5 text-green-500" /> High
                                </span>
                                <span className="text-xs font-bold font-mono">
                                    रु {(item.high || current).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-muted/50">
                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                    <TrendingDown className="w-2.5 h-2.5 text-red-500" /> Low
                                </span>
                                <span className="text-xs font-bold font-mono">
                                    रु {(item.low || current).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-muted/50">
                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                    <BarChart3 className="w-2.5 h-2.5 text-blue-500" /> Volume
                                </span>
                                <span className="text-xs font-bold font-mono">
                                    {(item.volume || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Investment Details */}
                        <div className="space-y-3 bg-muted/10 rounded-2xl p-4 border border-muted/30">
                            <div className="flex justify-between items-center pb-2 border-b border-muted/20">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-primary" /> Average Cost
                                </span>
                                <span className="text-sm font-black font-mono">रु {item.buyPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-muted/20">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5 text-primary" /> Total Investment
                                </span>
                                <span className="text-sm font-black font-mono">रु {investment.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-primary" /> Holding Period
                                </span>
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                                    Long Term
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-3 bg-muted/10 rounded-2xl p-4 border border-muted/30">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    Dividend History
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-[10px] font-black uppercase tracking-widest border-primary/20"
                                    onClick={() => {
                                        const nextValue = !showDividendHistory
                                        setShowDividendHistory(nextValue)
                                        if (nextValue) {
                                            void loadDividendHistory()
                                        }
                                    }}
                                >
                                    {showDividendHistory ? "Hide" : "Show"}
                                </Button>
                            </div>

                            {showDividendHistory && (
                                <div className="space-y-3">
                                    {isDividendHistoryLoading && (
                                        <p className="text-xs text-muted-foreground">Loading company dividend history...</p>
                                    )}

                                    {!isDividendHistoryLoading && dividendHistoryError && (
                                        <p className="text-xs text-destructive">{dividendHistoryError}</p>
                                    )}

                                    {!isDividendHistoryLoading && !dividendHistoryError && matchedDividendHistory.length === 0 && (
                                        <p className="text-xs text-muted-foreground">No dividend history found for this holding.</p>
                                    )}

                                    {!isDividendHistoryLoading && !dividendHistoryError && matchedDividendHistory.length > 0 && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Latest Cash</p>
                                                    <p className="text-sm font-black text-green-700 mt-1">{latestCashPercent.toFixed(2)}%</p>
                                                    <p className="text-[10px] text-green-700/80 mt-0.5">
                                                        Est. cash for {heldUnits} units: NPR {estimatedCashAmount.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Latest Bonus</p>
                                                    <p className="text-sm font-black text-blue-700 mt-1">{latestBonusPercent.toFixed(2)}%</p>
                                                    <p className="text-[10px] text-blue-700/80 mt-0.5">
                                                        Est. bonus for {heldUnits} units: {estimatedBonusUnits.toFixed(2)} units
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-muted/30 overflow-hidden">
                                                <div className="max-h-40 overflow-y-auto show-scrollbars">
                                                    <table className="w-full text-left">
                                                        <thead className="sticky top-0 bg-muted/70">
                                                            <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                                <th className="px-3 py-2">FY</th>
                                                                <th className="px-3 py-2">Cash</th>
                                                                <th className="px-3 py-2">Bonus</th>
                                                                <th className="px-3 py-2">Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {matchedDividendHistory.slice(0, 20).map((record) => (
                                                                <tr key={`${record.id}-${record.fiscal_year}-${record.announcement_date}`} className="border-t border-muted/20">
                                                                    <td className="px-3 py-2 text-[11px] font-semibold">{record.fiscal_year || "N/A"}</td>
                                                                    <td className="px-3 py-2 text-[11px] font-semibold text-green-700">
                                                                        {parsePositiveNumber(record.cash_dividend).toFixed(2)}%
                                                                    </td>
                                                                    <td className="px-3 py-2 text-[11px] font-semibold text-blue-700">
                                                                        {parsePositiveNumber(record.bonus_share).toFixed(2)}%
                                                                    </td>
                                                                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                                                                        {record.announcement_date || "N/A"}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="rounded-xl font-bold text-[11px] uppercase tracking-widest h-11 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                                onClick={() => window.open(`https://merolagani.com/CompanyDetail.aspx?symbol=${item.symbol}`, '_blank')}
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                View Analysis
                            </Button>
                            <Button
                                className="rounded-xl font-bold text-[11px] uppercase tracking-widest h-11 shadow-lg shadow-primary/20"
                                onClick={() => onOpenChange(false)}
                            >
                                Close Details
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    )
}
