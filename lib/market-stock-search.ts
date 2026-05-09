import type { PortfolioItem } from "@/types/wallet"
import { normalizeStockSymbol } from "@/lib/stock-symbol"
import { MARKET_SEARCH_PORTFOLIO_ID } from "@/lib/market-stock-detail"

export type LiveMarketStockQuote = {
    symbol: string
    name: string
    ltp: number
    previousClose: number
    change: number
    percentChange: number
    high?: number
    low?: number
    volume?: number
}

const asFiniteNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export const normalizeLiveMarketStockQuote = (
    raw: Record<string, unknown>,
    scripNamesMap: Record<string, string>,
): LiveMarketStockQuote | null => {
    const symbol = normalizeStockSymbol(String(raw.symbol || raw.ticker || raw.scrip || ""))
    if (!symbol) return null

    const ltp = asFiniteNumber(raw.last_traded_price ?? raw.ltp ?? raw.close ?? raw.price, Number.NaN)
    if (!Number.isFinite(ltp) || ltp <= 0) return null

    const previousClose = asFiniteNumber(raw.previous_close ?? raw.pc ?? raw.prev_close, ltp)
    const change = asFiniteNumber(raw.change, ltp - previousClose)
    const percentChange = asFiniteNumber(
        raw.percent_change ?? raw.percentChange,
        previousClose !== 0 ? (change / previousClose) * 100 : 0,
    )

    return {
        symbol,
        name: String(raw.name || scripNamesMap[symbol] || symbol).trim(),
        ltp,
        previousClose,
        change,
        percentChange,
        high: asFiniteNumber(raw.high ?? raw.high_price, ltp),
        low: asFiniteNumber(raw.low ?? raw.low_price, ltp),
        volume: asFiniteNumber(raw.volume ?? raw.total_volume, 0),
    }
}

export const buildLiveMarketStockQuotes = (
    rows: unknown[],
    scripNamesMap: Record<string, string>,
) => {
    const quoteMap = new Map<string, LiveMarketStockQuote>()

    rows.forEach((row) => {
        if (!row || typeof row !== "object") return
        const normalized = normalizeLiveMarketStockQuote(row as Record<string, unknown>, scripNamesMap)
        if (!normalized) return
        quoteMap.set(normalized.symbol, normalized)
    })

    return Array.from(quoteMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol))
}

export const filterLiveMarketStockQuotes = (
    quotes: LiveMarketStockQuote[],
    query: string,
) => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return quotes.slice(0, 8)

    return quotes
        .filter((quote) =>
            quote.symbol.toLowerCase().includes(normalizedQuery) ||
            quote.name.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 8)
}

export const createMarketSearchPortfolioItem = (
    quote: LiveMarketStockQuote,
    portfolio: PortfolioItem[],
    activePortfolioId: string | null,
): PortfolioItem => {
    const matchingHoldings = portfolio.filter((item) =>
        (item.assetType || "stock") === "stock" &&
        !item.cryptoId &&
        normalizeStockSymbol(item.symbol) === quote.symbol,
    )

    const preferredHolding = matchingHoldings.find((item) => item.portfolioId === activePortfolioId && item.units > 0)
        || matchingHoldings.find((item) => item.units > 0)
        || matchingHoldings[0]

    if (preferredHolding) {
        return {
            ...preferredHolding,
            detailContext: "portfolio",
            assetName: quote.name || preferredHolding.assetName || preferredHolding.symbol,
            currentPrice: quote.ltp,
            previousClose: quote.previousClose,
            change: quote.change,
            percentChange: quote.percentChange,
            high: quote.high,
            low: quote.low,
            volume: quote.volume,
            lastUpdated: new Date().toISOString(),
        }
    }

    return {
        id: `market-search-${quote.symbol}`,
        portfolioId: MARKET_SEARCH_PORTFOLIO_ID,
        symbol: quote.symbol,
        assetType: "stock",
        assetName: quote.name,
        detailContext: "market-search",
        units: 0,
        buyPrice: quote.ltp,
        currentPrice: quote.ltp,
        previousClose: quote.previousClose,
        change: quote.change,
        percentChange: quote.percentChange,
        high: quote.high,
        low: quote.low,
        volume: quote.volume,
        sector: "Others",
        lastUpdated: new Date().toISOString(),
    }
}
