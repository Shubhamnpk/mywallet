"use client"

import { useEffect, useMemo, useState } from "react"
import { Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ShareTransaction } from "@/types/wallet"

interface EditTransactionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: ShareTransaction | null
    onUpdate: (id: string, updates: Partial<Omit<ShareTransaction, "id">>) => Promise<void>
    stockOptions?: StockOption[]
    portfolioStockOptions?: StockOption[]
    portfolioCryptoOptions?: CryptoHoldingOption[]
    currencySymbol?: string
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

export function EditTransactionModal({
    open,
    onOpenChange,
    transaction,
    onUpdate,
    stockOptions = [],
    portfolioStockOptions = [],
    portfolioCryptoOptions = [],
    currencySymbol = "Rs. "
}: EditTransactionModalProps) {
    const [popularCoins, setPopularCoins] = useState<CryptoCoinOption[]>([])
    const [isLoadingCoins, setIsLoadingCoins] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // Form state
    const [formData, setFormData] = useState<Partial<ShareTransaction>>({
        symbol: "",
        assetType: "stock",
        cryptoId: "",
        quantity: 0,
        price: 0,
        type: "buy",
        date: "",
        description: ""
    })

    // Load transaction data when modal opens
    useEffect(() => {
        if (open && transaction) {
            setFormData({
                symbol: transaction.symbol || "",
                assetType: transaction.assetType || "stock",
                cryptoId: transaction.cryptoId || "",
                quantity: transaction.quantity || 0,
                price: transaction.price || 0,
                type: transaction.type || "buy",
                date: transaction.date || "",
                description: transaction.description || ""
            })
        }
    }, [open, transaction])

    // Load popular coins when crypto is selected
    useEffect(() => {
        if (!open || formData.assetType !== "crypto") return
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
    }, [open, formData.assetType])

    const isSellType = formData.type === "sell"
    const stockSuggestionPool = isSellType ? portfolioStockOptions : stockOptions
    const filteredStocks = useMemo(() => {
        const q = (formData.symbol || "").trim().toLowerCase()
        if (!q) return stockSuggestionPool.slice(0, 8)
        return stockSuggestionPool
            .filter((stock) =>
                stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [stockSuggestionPool, formData.symbol])

    const useHoldingCryptoSuggestions = isSellType
    const filteredCoins = useMemo(() => {
        if (useHoldingCryptoSuggestions) return []
        const q = (formData.symbol || "").trim().toLowerCase()
        if (!q) return popularCoins.slice(0, 8)
        return popularCoins
            .filter((coin) =>
                coin.symbol.toLowerCase().includes(q) || coin.name.toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [popularCoins, formData.symbol, useHoldingCryptoSuggestions])

    const filteredCryptoHoldings = useMemo(() => {
        if (!useHoldingCryptoSuggestions) return []
        const q = (formData.symbol || "").trim().toLowerCase()
        if (!q) return portfolioCryptoOptions.slice(0, 8)
        return portfolioCryptoOptions
            .filter((coin) =>
                coin.symbol.toLowerCase().includes(q) || (coin.name || "").toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [portfolioCryptoOptions, formData.symbol, useHoldingCryptoSuggestions])

    const totalAmount = useMemo(() => {
        const qty = Number(formData.quantity) || 0
        const price = Number(formData.price) || 0
        return qty * price
    }, [formData.quantity, formData.price])

    const handleUpdate = async () => {
        if (!transaction) return
        
        const hasValidQty = Number.isFinite(formData.quantity) && (formData.quantity || 0) > 0
        const hasValidPrice = formData.type === 'bonus' || formData.type === 'gift' || (Number.isFinite(formData.price) && (formData.price || 0) > 0)
        
        if (!formData.symbol || !hasValidQty || !hasValidPrice) {
            return
        }

        setIsUpdating(true)
        try {
            await onUpdate(transaction.id, {
                symbol: formData.symbol?.trim().toUpperCase(),
                assetType: formData.assetType,
                cryptoId: formData.cryptoId?.trim() || undefined,
                quantity: Number(formData.quantity),
                price: Number(formData.price),
                type: formData.type,
                date: formData.date,
                description: formData.description
            })
            onOpenChange(false)
        } finally {
            setIsUpdating(false)
        }
    }

    if (!transaction) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[425px] rounded-xl sm:rounded-2xl border border-primary/30 bg-background shadow-none ring-1 ring-border/60 backdrop-blur-none text-foreground subpixel-antialiased sm:data-[state=open]:zoom-in-100 sm:data-[state=closed]:zoom-out-100"
                overlayClassName="bg-black/45 backdrop-blur-none"
            >
                <DialogHeader className="pb-3 border-b border-primary/10">
                    <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                        <Edit3 className="w-5 h-5" />
                        Edit Transaction
                    </DialogTitle>
                    <DialogDescription className="font-medium">
                        Update transaction details for {transaction.symbol}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6" onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-assetType" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Asset Class</Label>
                            <Select
                                value={formData.assetType}
                                onValueChange={(v: "stock" | "crypto") => setFormData({
                                    ...formData,
                                    assetType: v,
                                    cryptoId: v === "crypto" ? (formData.cryptoId || "") : "",
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
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Input
                                id="edit-description"
                                className="rounded-xl border-muted-foreground/20"
                                value={formData.description || ""}
                                placeholder="Description (optional)"
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-type" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v: any) => setFormData({
                                    ...formData,
                                    type: v,
                                    price: (v === "bonus" || v === "gift") ? 0 : formData.price,
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
                            <Label htmlFor="edit-symbol" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Symbol</Label>
                            <div className="relative">
                                <Input
                                    id="edit-symbol"
                                    className="rounded-xl border-muted-foreground/20 font-bold uppercase"
                                    value={formData.symbol}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (formData.assetType === "crypto") {
                                            setFormData({ ...formData, symbol: value, cryptoId: "" })
                                            setShowSuggestions(true)
                                        } else {
                                            setFormData({ ...formData, symbol: value })
                                            setShowSuggestions(true)
                                        }
                                    }}
                                    placeholder={formData.assetType === "crypto" ? "Type BTC or Bitcoin" : "Type symbol or company name"}
                                />
                                {showSuggestions && (
                                    <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg max-h-52 overflow-auto">
                                        {formData.assetType === "crypto" ? (
                                            useHoldingCryptoSuggestions ? (
                                                filteredCryptoHoldings.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-muted-foreground">No matching holding found</div>
                                                ) : (
                                                    filteredCryptoHoldings.map((coin) => (
                                                        <button
                                                            key={`${coin.id || coin.symbol}`}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault()
                                                                setFormData({
                                                                    ...formData,
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
                                                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault()
                                                            setFormData({
                                                                ...formData,
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
                                                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault()
                                                            setFormData({
                                                                ...formData,
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
                    {formData.assetType === "crypto" && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                            {useHoldingCryptoSuggestions ? "Showing only your crypto holdings for sell." : "Pick from popular coins like Bitcoin (BTC), Ethereum (ETH), and more."}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-units" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Units</Label>
                            <Input
                                id="edit-units"
                                type="number"
                                step="any"
                                min="0"
                                className="rounded-xl border-muted-foreground/20 font-bold"
                                value={Number.isNaN(formData.quantity) ? "" : formData.quantity}
                                placeholder="0"
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        quantity: e.target.value === "" ? Number.NaN : Number(e.target.value),
                                    })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-price" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Price</Label>
                            <Input
                                id="edit-price"
                                type="number"
                                step="any"
                                min="0"
                                disabled={formData.type === 'bonus' || formData.type === 'gift'}
                                className="rounded-xl border-muted-foreground/20 font-bold"
                                value={Number.isNaN(formData.price) ? "" : formData.price}
                                placeholder="0"
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        price: e.target.value === "" ? Number.NaN : Number(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-date" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
                        <Input
                            id="edit-date"
                            type="date"
                            className="rounded-xl border-muted-foreground/20 font-medium"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    {/* Total Amount Display */}
                    <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Total Amount</span>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span className="text-base font-black font-mono text-primary">
                                    {currencySymbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                    {formData.quantity} units × {currencySymbol}{formData.price}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)} disabled={isUpdating}>Cancel</Button>
                    <Button className="rounded-xl font-bold px-8 shadow-md" onClick={handleUpdate} disabled={isUpdating}>
                        {isUpdating ? "Updating..." : "Update"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
