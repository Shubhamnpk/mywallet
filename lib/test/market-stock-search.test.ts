import { describe, expect, it } from "vitest"

import {
    buildLiveMarketStockQuotes,
    createMarketSearchPortfolioItem,
    filterLiveMarketStockQuotes,
} from "../market-stock-search"
import { MARKET_SEARCH_PORTFOLIO_ID } from "../market-stock-detail"
import type { PortfolioItem } from "@/types/wallet"

describe("market-stock-search", () => {
    it("normalizes and deduplicates live market quotes", () => {
        const quotes = buildLiveMarketStockQuotes([
            { symbol: "nabil", last_traded_price: 500, previous_close: 480, percent_change: 4.16, name: "Nabil Bank Limited" },
            { symbol: "NABIL", last_traded_price: 501, previous_close: 480, percent_change: 4.37, name: "Nabil Bank Limited" },
        ], {})

        expect(quotes).toHaveLength(1)
        expect(quotes[0]?.symbol).toBe("NABIL")
        expect(quotes[0]?.ltp).toBe(501)
    })

    it("filters quotes by symbol or company", () => {
        const quotes = buildLiveMarketStockQuotes([
            { symbol: "NABIL", last_traded_price: 500, previous_close: 480, name: "Nabil Bank Limited" },
            { symbol: "NTC", last_traded_price: 900, previous_close: 910, name: "Nepal Telecom" },
        ], {})

        expect(filterLiveMarketStockQuotes(quotes, "telecom")).toHaveLength(1)
        expect(filterLiveMarketStockQuotes(quotes, "nabil")[0]?.symbol).toBe("NABIL")
    })

    it("prefers a real holding before creating a synthetic detail item", () => {
        const portfolio: PortfolioItem[] = [
            {
                id: "p1-nabil",
                portfolioId: "p1",
                symbol: "NABIL",
                assetType: "stock",
                assetName: "Nabil Bank Limited",
                units: 10,
                buyPrice: 400,
            },
        ]

        const item = createMarketSearchPortfolioItem({
            symbol: "NABIL",
            name: "Nabil Bank Limited",
            ltp: 500,
            previousClose: 480,
            change: 20,
            percentChange: 4.16,
        }, portfolio, "p1")

        expect(item.id).toBe("p1-nabil")
        expect(item.currentPrice).toBe(500)
        expect(item.units).toBe(10)
        expect(item.detailContext).toBe("portfolio")
    })

    it("creates a synthetic zero-holding item for stocks outside the portfolio", () => {
        const item = createMarketSearchPortfolioItem({
            symbol: "NTC",
            name: "Nepal Telecom",
            ltp: 900,
            previousClose: 910,
            change: -10,
            percentChange: -1.1,
        }, [], "p1")

        expect(item.id).toBe("market-search-NTC")
        expect(item.portfolioId).toBe(MARKET_SEARCH_PORTFOLIO_ID)
        expect(item.detailContext).toBe("market-search")
        expect(item.units).toBe(0)
        expect(item.currentPrice).toBe(900)
        expect(item.isKeptZeroHolding).toBeUndefined()
    })
})
