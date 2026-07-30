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
}

export function ImportVerificationModal({
    open,
    onOpenChange,
    importQueue,
    importPrices,
    setImportPrices,
    importTransactionPrices,
    setImportTransactionPrices,
    onConfirm
}: ImportVerificationModalProps) {
    const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({})
    const symbolItems = useMemo(
        () => importQueue.filter((item) => !item.id?.includes("__row_") && item.type !== "Merger"),
        [importQueue]
    )
    const transactionItems = useMemo(() => importQueue.filter((item) => item.id?.includes("__row_") && item.type === "Buy"), [importQueue])
    const transactionsBySymbol = useMemo(() => {
        return transactionItems.reduce<Record<string, typeof transactionItems>>((groups, item) => {
            const key = item.symbol || "Unknown"
            groups[key] = groups[key] || []
            groups[key].push(item)
            return groups
        }, {})
    }, [transactionItems])
    const renderTransactionRateRow = (item: (typeof transactionItems)[number]) => {
        const rowId = item.id || item.symbol

        return (
            <div key={rowId} className="rounded-lg border bg-background/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                            {item.type}
                        </Badge>
                        {item.priceOptional && (
                            <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.date || "Unknown date"}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {item.quantity ? `${item.quantity} units` : "Units unavailable"}
                    {item.description ? ` - ${item.description}` : ""}
                </p>
                <div className="mt-2 flex items-center gap-3">
                    <Label className="text-[11px] font-black text-muted-foreground uppercase w-24">This rate</Label>
                    <Input
                        type="number"
                        value={importTransactionPrices[rowId] || ""}
                        onChange={(e) => setImportTransactionPrices(prev => ({ ...prev, [rowId]: e.target.value }))}
                        className="h-9 rounded-lg border-primary/10 bg-background font-mono font-bold focus:ring-primary/20"
                        placeholder={`Use ${importPrices[item.symbol] || "symbol"} rate`}
                    />
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <Info className="w-6 h-6 text-primary" />
                        Verify Cost Prices
                    </DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground">
                        We've identified items that need an initial cost price for accurate profit tracking.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[40vh] pr-4 mt-4" onKeyDown={(e) => e.key === "Enter" && onConfirm()}>
                    <div className="space-y-4 py-2">
                        {symbolItems.map((item) => {
                            const symbolTransactions = transactionsBySymbol[item.symbol] || []
                            const hasMultipleTransactions = symbolTransactions.length > 1
                            const isIpo = item.type === "IPO"
                            const expanded = expandedSymbols[item.symbol] ?? false
                            const customCount = symbolTransactions.filter((transaction) => {
                                const rowId = transaction.id || transaction.symbol
                                return Boolean(importTransactionPrices[rowId])
                            }).length

                            return (
                                <div key={item.symbol} className="flex flex-col gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm">{item.symbol}</span>
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider h-5 flex items-center justify-center border-primary/20 text-primary">
                                                {item.type}
                                            </Badge>
                                            {hasMultipleTransactions && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {symbolTransactions.length} tx
                                                </Badge>
                                            )}
                                        </div>
                                        {isIpo && (
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                                Auto-filled Face Value
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label className="text-[11px] font-black text-muted-foreground uppercase w-20">
                                            {isIpo ? "IPO Price" : "Buy Price"}
                                        </Label>
                                        <Input
                                            type="number"
                                            value={importPrices[item.symbol] || ""}
                                            onChange={(e) => setImportPrices(prev => ({ ...prev, [item.symbol]: e.target.value }))}
                                            className="h-9 rounded-lg border-primary/10 bg-background font-mono font-bold focus:ring-primary/20"
                                            placeholder="Use for all transactions..."
                                        />
                                    </div>

                                    {hasMultipleTransactions && (
                                        <div className="rounded-lg border bg-background/60">
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                                                onClick={() => setExpandedSymbols((prev) => ({ ...prev, [item.symbol]: !expanded }))}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-black">Set each transaction separately</span>
                                                        {customCount > 0 && (
                                                            <Badge variant="secondary" className="text-[10px]">{customCount} custom</Badge>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        Leave blank to use the buy price above.
                                                    </p>
                                                </div>
                                                {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                            </button>

                                            {expanded && (
                                                <div className="space-y-2 border-t px-3 py-3">
                                                    {symbolTransactions.map((transaction) => renderTransactionRateRow(transaction))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-6 gap-2">
                    <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button className="rounded-xl font-black bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-8" onClick={onConfirm}>
                        Complete Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
