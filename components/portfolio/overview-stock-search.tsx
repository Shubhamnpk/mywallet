"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { Search, TrendingDown, TrendingUp } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { PortfolioItem } from "@/types/wallet"
import {
    buildLiveMarketStockQuotes,
    createMarketSearchPortfolioItem,
    filterLiveMarketStockQuotes,
    type LiveMarketStockQuote,
} from "@/lib/market-stock-search"
import { cn } from "@/lib/utils"

interface OverviewStockSearchProps {
    portfolio: PortfolioItem[]
    activePortfolioId: string | null
    scripNamesMap: Record<string, string>
    onOpenStockDetail: (item: PortfolioItem) => void
}

export function OverviewStockSearch({
    portfolio,
    activePortfolioId,
    scripNamesMap,
    onOpenStockDetail,
}: OverviewStockSearchProps) {
    const [isFocused, setIsFocused] = useState(false)
    const [query, setQuery] = useState("")
    const [quotes, setQuotes] = useState<LiveMarketStockQuote[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const deferredQuery = useDeferredValue(query)

    useEffect(() => {
        if (!isFocused || quotes.length > 0) {
            return
        }

        let cancelled = false

        const loadQuotes = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const response = await fetch("/api/nepse/today", { signal: AbortSignal.timeout(10000) })
                const payload = await response.json()
                if (!response.ok) {
                    throw new Error(payload?.message || payload?.error || "Unable to load live stock prices.")
                }
                if (!Array.isArray(payload)) {
                    throw new Error("Live stock search data was invalid.")
                }

                if (!cancelled) {
                    setQuotes(buildLiveMarketStockQuotes(payload, scripNamesMap))
                }
            } catch (fetchError: unknown) {
                if (!cancelled) {
                    setError(fetchError instanceof Error ? fetchError.message : "Unable to load live stock prices.")
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadQuotes()

        return () => {
            cancelled = true
        }
    }, [isFocused, quotes.length, scripNamesMap])

    const filteredQuotes = useMemo(
        () => filterLiveMarketStockQuotes(quotes, deferredQuery),
        [deferredQuery, quotes],
    )
    const visibleQuotes = filteredQuotes.slice(0, 2)

    const hasQuery = deferredQuery.trim().length > 0
    const showSuggestions = isFocused && hasQuery

    return (
        <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
                <h4 className="text-sm font-black uppercase tracking-widest">Stock Lookup</h4>
                <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[9px] font-black uppercase tracking-wider">
                    Live
                </Badge>
            </div>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        window.setTimeout(() => setIsFocused(false), 120)
                    }}
                    placeholder="Search any NEPSE stock by symbol or company"
                    className="h-10 rounded-xl border-primary/20 bg-background/80 pl-9"
                />

                {showSuggestions && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-xl border border-primary/20 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
                        {isLoading && (
                            <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">Loading live stock prices...</p>
                        )}

                        {!isLoading && error && (
                            <p className="px-2 py-2 text-xs font-semibold text-destructive">{error}</p>
                        )}

                        {!isLoading && !error && (
                            <div className="space-y-2">
                                {visibleQuotes.map((quote) => {
                                    const isPositive = quote.change >= 0
                                    return (
                                        <button
                                            key={quote.symbol}
                                            type="button"
                                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-muted/30 bg-background/70 px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => {
                                                onOpenStockDetail(createMarketSearchPortfolioItem(quote, portfolio, activePortfolioId))
                                                setQuery("")
                                                setIsFocused(false)
                                            }}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black uppercase">{quote.symbol}</p>
                                                    <Badge variant="outline" className="h-5 rounded-md text-[9px] font-black uppercase">
                                                        Live
                                                    </Badge>
                                                </div>
                                                <p className="truncate text-[11px] text-muted-foreground">{quote.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black font-mono">NPR {quote.ltp.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                                <p
                                                    className={cn(
                                                        "inline-flex items-center gap-1 text-[11px] font-black",
                                                        isPositive ? "text-success" : "text-error",
                                                    )}
                                                >
                                                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                    {isPositive ? "+" : ""}{quote.percentChange.toFixed(2)}%
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}

                                {filteredQuotes.length === 0 && (
                                    <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">No matching stock found for that search.</p>
                                )}

                                {filteredQuotes.length > 2 && (
                                    <p className="px-2 text-[11px] font-semibold text-muted-foreground">
                                        Showing 2 of {filteredQuotes.length} matches.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
