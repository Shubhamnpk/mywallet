"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,DialogTrigger} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select"
import { AppDateInput } from "@/components/ui/app-date-input"
import type { CalendarSystem } from "@/lib/app-calendar"
import { createNepseTradePreview } from "@/lib/nepse-trade-preview"
import type { PortfolioItem } from "@/types/wallet"

type StockTransactionType = "buy" | "sell" | "ipo" | "reinvestment" | "bonus" | "gift" | "merger_in" | "merger_out"

export type TransactionDraft = {
    symbol: string
    assetType: "stock" | "crypto"
    cryptoId: string
    quantity: number
    price: number
    type: StockTransactionType
    date: string
    description: string
}

interface AddTransactionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    newTx: TransactionDraft
    setNewTx: (tx: TransactionDraft) => void
    onAdd: () => Promise<void>
    stockOptions?: StockOption[]
    portfolioStockOptions?: StockOption[]
    portfolioCryptoOptions?: CryptoHoldingOption[]
    portfolioItems?: PortfolioItem[]
    activePortfolioId?: string
    currencySymbol?: string
    calendarSystem?: CalendarSystem
}

type CryptoCoinOption = {
    id: string
    symbol: string
    name: string
    rank: number
}

type CryptoHoldingOption = {
    id?: string
    symbol: string
    name?: string
}

type StockOption = {
    symbol: string
    name: string
}

export function AddTransactionModal({
    open,
    onOpenChange,
    newTx,
    setNewTx,
    onAdd,
    stockOptions = [],
    portfolioStockOptions = [],
    portfolioCryptoOptions = [],
    portfolioItems = [],
    activePortfolioId,
    currencySymbol = "Rs. ",
    calendarSystem = "AD"
}: AddTransactionModalProps) {
    const [popularCoins, setPopularCoins] = useState<CryptoCoinOption[]>([])
    const [isLoadingCoins, setIsLoadingCoins] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isPreviewDetailsOpen, setIsPreviewDetailsOpen] = useState(false)

    useEffect(() => {
        if (!open || newTx.assetType !== "crypto") return
        let mounted = true
        const loadCoins = async () => {
            setIsLoadingCoins(true)
            try {
                const res = await fetch("/api/crypto/coinlore/popular")
                if (!res.ok) {
                    throw new Error(`Failed to load coins: ${res.status}`)
                }
                const data = await res.json()
                if (mounted && Array.isArray(data?.coins)) {
                    setPopularCoins(data.coins)
                }
            } finally {
                if (mounted) setIsLoadingCoins(false)
            }
        }
        void loadCoins()
        return () => { mounted = false }
    }, [open, newTx.assetType])

    const isSellType = newTx.type === "sell"
    const stockSuggestionPool = isSellType ? portfolioStockOptions : stockOptions

    const filteredStocks = useMemo(() => {
        const q = (newTx.symbol || "").trim().toLowerCase()
        if (!q) return stockSuggestionPool.slice(0, 8)
        return stockSuggestionPool
            .filter((stock) =>
                stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [stockSuggestionPool, newTx.symbol])

    const useHoldingCryptoSuggestions = isSellType

    const filteredCoins = useMemo(() => {
        if (useHoldingCryptoSuggestions) return []
        const q = (newTx.symbol || "").trim().toLowerCase()
        if (!q) return popularCoins.slice(0, 8)
        return popularCoins
            .filter((coin) =>
                coin.symbol.toLowerCase().includes(q) || coin.name.toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [popularCoins, newTx.symbol, useHoldingCryptoSuggestions])

    const filteredCryptoHoldings = useMemo(() => {
        if (!useHoldingCryptoSuggestions) return []
        const q = (newTx.symbol || "").trim().toLowerCase()
        if (!q) return portfolioCryptoOptions.slice(0, 8)
        return portfolioCryptoOptions
            .filter((coin) =>
                coin.symbol.toLowerCase().includes(q) || (coin.name || "").toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [portfolioCryptoOptions, newTx.symbol, useHoldingCryptoSuggestions])

    const totalAmount = useMemo(() => {
        const qty = Number(newTx.quantity) || 0
        const price = Number(newTx.price) || 0
        return qty * price
    }, [newTx.quantity, newTx.price])

    const sellReferenceHolding = useMemo(() => {
        if (newTx.assetType !== "stock" || newTx.type !== "sell") return null
        const normalizedSymbol = (newTx.symbol || "").trim().toUpperCase()
        if (!normalizedSymbol) return null

        return portfolioItems.find((item) => (
            item.portfolioId === activePortfolioId &&
            (item.assetType || "stock") === "stock" &&
            item.symbol.trim().toUpperCase() === normalizedSymbol
        )) || null
    }, [activePortfolioId, newTx.assetType, newTx.symbol, newTx.type, portfolioItems])

    const isStockTradePreview = newTx.assetType === "stock" && (newTx.type === "buy" || newTx.type === "sell")

    const tradePreview = useMemo(
        () => isStockTradePreview
            ? createNepseTradePreview(
                Number(newTx.quantity) || 0,
                Number(newTx.price) || 0,
                newTx.type as "buy" | "sell",
                newTx.type === "sell" ? (sellReferenceHolding?.buyPrice ?? 0) : 0,
            )
            : null,
        [isStockTradePreview, newTx.price, newTx.quantity, newTx.type, sellReferenceHolding?.buyPrice],
    )

    const resolvedCurrencySymbol = currencySymbol.trim().toUpperCase() === "NPR" ? "रु " : currencySymbol

    const formatMoney = (value: number) =>
        `${resolvedCurrencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    const formatMoneyPlain = (value: number) =>
        value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const formatPercent = (value: number) =>
        `${(value * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    setIsPreviewDetailsOpen(false)
                }
                onOpenChange(nextOpen)
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" className="h-10 rounded-xl px-4 font-bold shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" />
                    New Transaction
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[425px] rounded-xl sm:rounded-2xl border border-primary/30 bg-background shadow-none ring-1 ring-border/60 backdrop-blur-none text-foreground subpixel-antialiased sm:data-[state=open]:zoom-in-100 sm:data-[state=closed]:zoom-out-100"
                overlayClassName="bg-black/45 backdrop-blur-none"
            >
                <DialogHeader className="pb-3 border-b border-primary/10">
                    <DialogTitle className="text-2xl font-black text-primary">Record Transaction</DialogTitle>
                    <DialogDescription className="font-medium">
                        Manage buys, sells, IPOs, reinvestments, or bonuses to keep your portfolio accurate.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6" onKeyDown={(e) => e.key === "Enter" && onAdd()}>
                    <div className="grid gap-2">
                        <Label htmlFor="assetType" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Asset Class</Label>
                        <Select
                            value={newTx.assetType}
                            onValueChange={(v: "stock" | "crypto") => setNewTx({
                                ...newTx,
                                assetType: v,
                                cryptoId: v === "crypto" ? (newTx.cryptoId || "") : "",
                            })}
                        >
                            <SelectTrigger className="rounded-xl border-muted-foreground/20">
                                <SelectValue placeholder="Select asset class" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="stock">Stock / Share</SelectItem>
                                <SelectItem value="crypto">Crypto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                            <Select
                                value={newTx.type}
                                onValueChange={(v: string) => setNewTx({
                                    ...newTx,
                                    type: v as StockTransactionType,
                                    price: (v === "bonus" || v === "gift") ? 0 : newTx.price,
                                })}
                            >
                                <SelectTrigger className="rounded-xl border-muted-foreground/20">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="buy">Buy</SelectItem>
                                    <SelectItem value="sell">Sell</SelectItem>
                                    <SelectItem value="ipo">IPO</SelectItem>
                                    <SelectItem value="reinvestment">Reinvestment</SelectItem>
                                    <SelectItem value="bonus">Bonus</SelectItem>
                                    <SelectItem value="gift">Gift</SelectItem>
                                    <SelectItem value="merger_in">Merger In</SelectItem>
                                    <SelectItem value="merger_out">Merger Out</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="symbol" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Symbol</Label>
                            <div className="relative">
                                <Input
                                    id="symbol"
                                    className="rounded-xl border-muted-foreground/20 font-bold uppercase"
                                    value={newTx.symbol}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (newTx.assetType === "crypto") {
                                            setNewTx({ ...newTx, symbol: value, cryptoId: "" })
                                            setShowSuggestions(true)
                                        } else {
                                            setNewTx({ ...newTx, symbol: value })
                                            setShowSuggestions(true)
                                        }
                                    }}
                                    placeholder={newTx.assetType === "crypto" ? "Type BTC or Bitcoin" : "Type symbol or company name"}
                                />
                                {showSuggestions && (
                                    <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-xl border bg-popover shadow-lg">
                                        {newTx.assetType === "crypto" ? (
                                            useHoldingCryptoSuggestions ? (
                                                filteredCryptoHoldings.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-muted-foreground">No matching holding found</div>
                                                ) : (
                                                    filteredCryptoHoldings.map((coin) => (
                                                        <button
                                                            key={`${coin.id || coin.symbol}`}
                                                            type="button"
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault()
                                                                setNewTx({
                                                                    ...newTx,
                                                                    symbol: coin.symbol,
                                                                    cryptoId: coin.id || "",
                                                                })
                                                                setShowSuggestions(false)
                                                            }}
                                                        >
                                                            <span className="font-bold">{coin.symbol}</span>
                                                            {coin.name && <span className="text-muted-foreground"> - {coin.name}</span>}
                                                        </button>
                                                    ))
                                                )
                                            ) : isLoadingCoins ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">Loading coins...</div>
                                            ) : filteredCoins.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">No matching coin found</div>
                                            ) : (
                                                filteredCoins.map((coin) => (
                                                    <button
                                                        key={coin.id}
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault()
                                                            setNewTx({
                                                                ...newTx,
                                                                symbol: coin.symbol,
                                                                cryptoId: coin.id,
                                                            })
                                                            setShowSuggestions(false)
                                                        }}
                                                    >
                                                        <span className="font-bold">{coin.symbol}</span>
                                                        <span className="text-muted-foreground"> - {coin.name}</span>
                                                    </button>
                                                ))
                                            )
                                        ) : (
                                            filteredStocks.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                                    {isSellType ? "No matching holding found" : "No matching stock found"}
                                                </div>
                                            ) : (
                                                filteredStocks.map((stock) => (
                                                    <button
                                                        key={stock.symbol}
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault()
                                                            setNewTx({
                                                                ...newTx,
                                                                symbol: stock.symbol,
                                                            })
                                                            setShowSuggestions(false)
                                                        }}
                                                    >
                                                        <span className="font-bold">{stock.symbol}</span>
                                                        <span className="text-muted-foreground"> - {stock.name}</span>
                                                    </button>
                                                ))
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {newTx.assetType === "crypto" && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                            {useHoldingCryptoSuggestions ? "Showing only your crypto holdings for sell." : "Pick from popular coins like Bitcoin (BTC), Ethereum (ETH), and more."}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="units" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Units</Label>
                            <Input
                                id="units"
                                type="number"
                                step="any"
                                min="0"
                                className="rounded-xl border-muted-foreground/20 font-bold"
                                value={Number.isNaN(newTx.quantity) ? "" : newTx.quantity}
                                placeholder="0"
                                onChange={(e) =>
                                    setNewTx({
                                        ...newTx,
                                        quantity: e.target.value === "" ? Number.NaN : Number(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="price" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Price</Label>
                            <Input
                                id="price"
                                type="number"
                                step="any"
                                min="0"
                                disabled={newTx.type === "bonus" || newTx.type === "gift"}
                                className="rounded-xl border-muted-foreground/20 font-bold"
                                value={Number.isNaN(newTx.price) ? "" : newTx.price}
                                placeholder="0"
                                onChange={(e) =>
                                    setNewTx({
                                        ...newTx,
                                        price: e.target.value === "" ? Number.NaN : Number(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="date" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
                        <AppDateInput
                            id="date"
                            className="rounded-xl border-muted-foreground/20 font-medium"
                            value={newTx.date}
                            calendarSystem={calendarSystem}
                            onChange={(date) => setNewTx({ ...newTx, date })}
                        />
                    </div>

                    {tradePreview ? (
                        <div className="mt-2 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                                    Preview Calculation
                                </span>
                                <div className="text-right">
                                    <span className="text-base font-black font-mono text-primary">
                                        {formatMoney(tradePreview.settlementAmount)}
                                    </span>
                                    <p className="text-[10px] text-muted-foreground">
                                        {newTx.type === "buy" ? "Estimated total payable" : "Estimated net receivable"}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                                onClick={() => setIsPreviewDetailsOpen((prev) => !prev)}
                            >
                                Detailed Charges
                                {isPreviewDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {isPreviewDetailsOpen && (
                                <div className="space-y-3 border-t border-primary/10 pt-3">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">Share Amount</span>
                                        <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.shareAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">Share Quantity</span>
                                        <span className="font-bold">{tradePreview.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold uppercase tracking-wider text-muted-foreground">Total Charges</span>
                                        <span className="font-black font-mono">{formatMoneyPlain(tradePreview.totalCharges)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold uppercase tracking-wider text-muted-foreground">Effective Rate</span>
                                        <span className="font-black font-mono">{formatMoneyPlain(tradePreview.effectiveRate)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">Broker Comm.</span>
                                        <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.brokerCommission)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">Broker Rate</span>
                                        <span className="font-bold">{formatPercent(tradePreview.brokerRate)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">Total Commission</span>
                                        <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.totalCommission)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">NEPSE Comm.</span>
                                        <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.nepseCommission)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">SEBO Comm.</span>
                                        <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.seboCommission)}</span>
                                    </div>
                                    {newTx.type === "sell" && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-muted-foreground">
                                                Capital Gain Tax ({formatPercent(tradePreview.capitalGainTaxRate)})
                                            </span>
                                            <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.capitalGainTax)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">Regulatory Fee</span>
                                        <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.regulatoryFee)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">DP Amount</span>
                                        <span className="font-bold font-mono">{formatMoneyPlain(tradePreview.dpAmount)}</span>
                                    </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Estimated using standard NEPSE brokerage slabs and common transaction charges. Final broker note may vary slightly.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Total Amount</span>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="text-base font-black font-mono text-primary">
                                        {formatMoney(totalAmount)}
                                    </span>
                                    <span className="truncate text-[10px] text-muted-foreground">
                                        {(Number(newTx.quantity) || 0).toLocaleString()} units x {formatMoney(Number(newTx.price) || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="rounded-xl font-bold px-8 shadow-md" onClick={onAdd}>Record</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
