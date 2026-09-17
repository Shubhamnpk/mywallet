"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ImportVerificationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    importQueue: Array<{
        id?: string
        symbol: string
        type: string
        defaultPrice: number
        date?: string
        quantity?: number
        description?: string
        priceOptional?: boolean
    }>
    importPrices: Record<string, string>
    setImportPrices: (prices: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
    importTransactionPrices: Record<string, string>
    setImportTransactionPrices: (prices: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
    onConfirm: () => Promise<void>
    stats?: {
        fetchedCount: number
        mergedCount: number
        existingCount: number
        needsPriceCount: number
    } | null
}

export function ImportVerificationModal({
    open,
    onOpenChange,
    importQueue,
    importPrices,
    setImportPrices,
    importTransactionPrices,
    setImportTransactionPrices,
    onConfirm,
    stats
}: ImportVerificationModalProps) {
    const [expandedAuto, setExpandedAuto] = useState<Record<string, boolean>>({})
    const [showPrefilled, setShowPrefilled] = useState(false)
    const symbolItems = useMemo(
        () => importQueue.filter((item) => !item.id?.includes("__row_") && item.type !== "Merger"),
        [importQueue]
    )
    const transactionItems = useMemo(() => importQueue.filter((item) => item.id?.includes("__row_") && (item.type === "Buy" || item.type === "Sell" || item.type === "IPO")), [importQueue])
    const transactionsBySymbol = useMemo(() => {
        return transactionItems.reduce<Record<string, typeof transactionItems>>((groups, item) => {
            const key = item.symbol || "Unknown"
            groups[key] = groups[key] || []
            groups[key].push(item)
            return groups
        }, {})
    }, [transactionItems])
    const needsPriceSymbols = useMemo(
        () => symbolItems.filter((item) => {
            const txs = transactionsBySymbol[item.symbol] || []
            return txs.some((t) => t.type === "Buy" || t.type === "Sell")
        }),
        [symbolItems, transactionsBySymbol]
    )
    const autoOnlySymbols = useMemo(
        () => symbolItems.filter((item) => {
            const txs = transactionsBySymbol[item.symbol] || []
            return txs.length > 0 && txs.every((t) => t.type !== "Buy" && t.type !== "Sell")
        }),
        [symbolItems, transactionsBySymbol]
    )

    const renderTransactionRateRow = (item: (typeof transactionItems)[number]) => {
        const rowId = item.id || item.symbol
        return (
            <div key={rowId} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider">
                            {item.type}
                        </Badge>
                        <span className="text-xs font-medium">{item.date || "—"}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{item.quantity ?? "—"} units</div>
                </div>
                <Input
                    type="number"
                    value={importTransactionPrices[rowId] || ""}
                    onChange={(e) => setImportTransactionPrices(prev => ({ ...prev, [rowId]: e.target.value }))}
                    className="h-8 w-28 rounded-lg border-primary/10 bg-background font-mono text-sm font-bold focus:ring-primary/20"
                    placeholder="Rate"
                />
            </div>
        )
    }

    const renderSymbolCard = (item: (typeof symbolItems)[number]) => {
        const symbolTransactions = transactionsBySymbol[item.symbol] || []
        const isIpo = item.type === "IPO"
        const needsTx = symbolTransactions.filter((t) => t.type === "Buy" || t.type === "Sell")
        const autoTx = symbolTransactions.filter((t) => t.type !== "Buy" && t.type !== "Sell")
        const showAuto = expandedAuto[item.symbol] || false
        const customCount = symbolTransactions.filter((transaction) => {
            const rowId = transaction.id || transaction.symbol
            return Boolean(importTransactionPrices[rowId])
        }).length

        return (
            <div key={item.symbol} className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black">{item.symbol}</span>
                        <Badge variant="outline" className="h-5 border-primary/20 px-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {item.type}
                        </Badge>
                        {symbolTransactions.length > 1 && (
                            <span className="text-xs text-muted-foreground">{symbolTransactions.length} tx</span>
                        )}
                    </div>
                    {isIpo && <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Face value</span>}
                </div>

                {needsTx.length === 1 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                        {needsTx[0].date || "—"} · {needsTx[0].quantity ?? "—"} units
                    </div>
                )}
                {needsTx.length === 1 ? (
                    <div className="mt-3 flex items-center gap-3">
                        <Label className="w-20 shrink-0 text-[11px] font-bold uppercase text-muted-foreground">
                            {isIpo ? "IPO Price" : item.type === "Sell" ? "Sell Price" : "Buy Price"}
                        </Label>
                        <Input
                            type="number"
                            value={importPrices[item.symbol] || ""}
                            onChange={(e) => setImportPrices(prev => ({ ...prev, [item.symbol]: e.target.value }))}
                            className="h-8 flex-1 rounded-lg border-primary/10 bg-background font-mono text-sm font-bold focus:ring-primary/20"
                            placeholder="Rate"
                        />
                    </div>
                ) : needsTx.length > 1 ? (
                    <div className="mt-3 space-y-2">
                        {needsTx.map(renderTransactionRateRow)}
                    </div>
                ) : null}
                {needsTx.length === 1 && autoTx.length === 0 && null}
                {autoTx.length > 0 && (
                    <div className="mt-2 rounded-lg border bg-background/40">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left"
                            onClick={() => setExpandedAuto((prev) => ({ ...prev, [item.symbol]: !prev[item.symbol] }))}
                        >
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                View {autoTx.length} auto-filled
                            </span>
                            {showAuto ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        </button>
                        {showAuto && <div className="space-y-2 border-t px-3 py-2.5">{autoTx.map(renderTransactionRateRow)}</div>}
                    </div>
                )}
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-2xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black">
                        <Info className="h-5 w-5 text-primary" />
                        Verify Cost Prices
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Prefilled where available. Leave blank to import as-is.
                    </DialogDescription>
                    {stats && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            <Badge variant="secondary" className="text-[10px] font-bold">New {stats.needsPriceCount}</Badge>
                            <Badge variant="outline" className="text-[10px]">Fetched {stats.fetchedCount}</Badge>
                        </div>
                    )}
                </DialogHeader>

                <ScrollArea className="max-h-[42vh] pr-3" onKeyDown={(e) => e.key === "Enter" && onConfirm()}>
                    <div className="space-y-3 py-2">
                        {needsPriceSymbols.map(renderSymbolCard)}
                        {autoOnlySymbols.length > 0 && (
                            <div className="rounded-xl border bg-background/40">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                                    onClick={() => setShowPrefilled((prev) => !prev)}
                                >
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {autoOnlySymbols.length} auto-filled
                                    </span>
                                    {showPrefilled ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                </button>
                                {showPrefilled && (
                                    <div className="space-y-3 border-t px-3 py-3">{autoOnlySymbols.map(renderSymbolCard)}</div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2">
                    <Button variant="secondary" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button className="rounded-xl bg-primary px-6 font-black shadow-lg shadow-primary/20 hover:bg-primary/90" onClick={onConfirm}>
                        Complete Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
