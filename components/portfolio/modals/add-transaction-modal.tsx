"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface AddTransactionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    newTx: {
        symbol: string
        assetType: "stock" | "crypto"
        cryptoId?: string
        quantity: number
        price: number
        type: string
        date: string
        description: string
    }
    setNewTx: (tx: any) => void
    onAdd: () => Promise<void>
    stockOptions?: StockOption[]
}

type CryptoCoinOption = {
    id: string
    symbol: string
    name: string
    rank: number
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
    stockOptions = []
}: AddTransactionModalProps) {
    const [popularCoins, setPopularCoins] = useState<CryptoCoinOption[]>([])
    const [isLoadingCoins, setIsLoadingCoins] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)

    useEffect(() => {
        if (!open || newTx.assetType !== "crypto") return
        let mounted = true
        const loadCoins = async () => {
            setIsLoadingCoins(true)
            try {
                const res = await fetch("/api/crypto/coinlore/popular")
                const data = await res.json()
                if (mounted && res.ok && Array.isArray(data?.coins)) {
                    setPopularCoins(data.coins)
                }
            } finally {
                if (mounted) setIsLoadingCoins(false)
            }
        }
        void loadCoins()
        return () => { mounted = false }
    }, [open, newTx.assetType])

    const filteredCoins = useMemo(() => {
        const q = (newTx.symbol || "").trim().toLowerCase()
        if (!q) return popularCoins.slice(0, 8)
        return popularCoins
            .filter((coin) =>
                coin.symbol.toLowerCase().includes(q) || coin.name.toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [popularCoins, newTx.symbol])
    const filteredStocks = useMemo(() => {
        const q = (newTx.symbol || "").trim().toLowerCase()
        if (!q) return stockOptions.slice(0, 8)
        return stockOptions
            .filter((stock) =>
                stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [stockOptions, newTx.symbol])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-10 rounded-xl px-4 font-bold shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" />
                    New Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Record Transaction</DialogTitle>
                    <DialogDescription className="font-medium">
                        Manage buys, sells, IPOs, or bonuses to keep your portfolio accurate.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6" onKeyDown={(e) => e.key === 'Enter' && onAdd()}>
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
                                onValueChange={(v: any) => setNewTx({ ...newTx, type: v })}
                            >
                                <SelectTrigger className="rounded-xl border-muted-foreground/20">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="buy">Buy</SelectItem>
                                    <SelectItem value="sell">Sell</SelectItem>
                                    <SelectItem value="ipo">IPO</SelectItem>
                                    <SelectItem value="bonus">Bonus</SelectItem>
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
                                    <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg max-h-52 overflow-auto">
                                        {newTx.assetType === "crypto" ? (
                                            isLoadingCoins ? (
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
                                                <div className="px-3 py-2 text-xs text-muted-foreground">No matching stock found</div>
                                            ) : (
                                                filteredStocks.map((stock) => (
                                                    <button
                                                        key={stock.symbol}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
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
                            Pick from popular coins like Bitcoin (BTC), Ethereum (ETH), and more.
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
                                disabled={newTx.type === 'bonus'}
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
                        <Input
                            id="date"
                            type="date"
                            className="rounded-xl border-muted-foreground/20 font-medium"
                            value={newTx.date}
                            onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="rounded-xl font-bold px-8 shadow-md" onClick={onAdd}>Record</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
