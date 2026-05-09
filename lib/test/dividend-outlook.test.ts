import { describe, expect, it } from "vitest"

import { buildDividendData, getDefaultDividendYear, type ProposedDividendRecord } from "../dividend-outlook"
import type { Portfolio, PortfolioItem, ShareTransaction } from "@/types/wallet"

describe("dividend-outlook", () => {
    it("defaults to the latest completed year before the current year", () => {
        expect(getDefaultDividendYear(["2026/77", "2025/76", "2024/75"])).toBe("2025/76")
    })

    it("uses historical units for the selected year even after later sales", () => {
        const dividendHistory: ProposedDividendRecord[] = [
            {
                id: 1,
                symbol: "NABIL",
                company_name: "Nabil Bank Limited",
                cash_dividend: "10",
                bonus_share: "5",
                fiscal_year: "2025/76",
                announcement_date: "2025-08-01",
            },
        ]

        const portfolios: Portfolio[] = [
            { id: "p1", name: "Main", description: "", color: "#000", includeInTotals: true, isDefault: true, createdAt: "2025-01-01" },
        ]

        const portfolio: PortfolioItem[] = []

        const shareTransactions: ShareTransaction[] = [
            {
                id: "t1",
                portfolioId: "p1",
                symbol: "NABIL",
                quantity: 10,
                price: 1000,
                type: "buy",
                date: "2025-01-10",
                assetType: "stock",
                description: "",
            },
            {
                id: "t2",
                portfolioId: "p1",
                symbol: "NABIL",
                quantity: 10,
                price: 1200,
                type: "sell",
                date: "2026-01-10",
                assetType: "stock",
                description: "",
            },
        ]

        const result = buildDividendData({
            dividendHistory,
            dividendViewMode: "historical",
            selectedDividendYear: "2025/76",
            portfolios,
            portfolio,
            shareTransactions,
            scripNamesMap: { NABIL: "Nabil Bank Limited" },
            includedPortfolioIds: new Set(["p1"]),
            getFaceValue: () => 100,
        })

        expect(result.dividendPortfolioRows).toHaveLength(1)
        expect(result.dividendPortfolioRows[0]?.holdings[0]?.units).toBe(10)
        expect(result.dividendPortfolioRows[0]?.estimatedCash).toBe(100)
        expect(result.dividendPortfolioRows[0]?.estimatedBonusUnits).toBe(0.5)
        expect(result.dividendPortfolioRows[0]?.topCashContributor?.symbol).toBe("NABIL")
        expect(result.dividendPortfolioRows[0]?.topBonusContributor?.symbol).toBe("NABIL")
    })

    it("tracks best cash and bonus contributors in historical/current modes", () => {
        const dividendHistory: ProposedDividendRecord[] = [
            {
                id: 1,
                symbol: "AAA",
                company_name: "AAA Limited",
                cash_dividend: "20",
                bonus_share: "0",
                fiscal_year: "2025/76",
                announcement_date: "2025-08-01",
            },
            {
                id: 2,
                symbol: "BBB",
                company_name: "BBB Limited",
                cash_dividend: "2",
                bonus_share: "20",
                fiscal_year: "2025/76",
                announcement_date: "2025-08-02",
            },
        ]

        const portfolios: Portfolio[] = [
            { id: "p1", name: "Main", description: "", color: "#000", includeInTotals: true, isDefault: true, createdAt: "2024-01-01" },
        ]

        const portfolio: PortfolioItem[] = [
            { id: "h1", portfolioId: "p1", symbol: "AAA", assetName: "AAA Limited", units: 10, buyPrice: 1000, assetType: "stock" },
            { id: "h2", portfolioId: "p1", symbol: "BBB", assetName: "BBB Limited", units: 10, buyPrice: 1000, assetType: "stock" },
        ]

        const shareTransactions: ShareTransaction[] = [
            { id: "t1", portfolioId: "p1", symbol: "AAA", quantity: 10, price: 1000, type: "buy", date: "2024-01-10", assetType: "stock", description: "" },
            { id: "t2", portfolioId: "p1", symbol: "BBB", quantity: 10, price: 1000, type: "buy", date: "2024-01-10", assetType: "stock", description: "" },
        ]

        const historicalResult = buildDividendData({
            dividendHistory,
            dividendViewMode: "historical",
            selectedDividendYear: "2025/76",
            portfolios,
            portfolio,
            shareTransactions,
            scripNamesMap: { AAA: "AAA Limited", BBB: "BBB Limited" },
            includedPortfolioIds: new Set(["p1"]),
            getFaceValue: () => 100,
        })

        expect(historicalResult.dividendPortfolioRows[0]?.topCashContributor?.symbol).toBe("AAA")
        expect(historicalResult.dividendPortfolioRows[0]?.topBonusContributor?.symbol).toBe("BBB")

        const currentResult = buildDividendData({
            dividendHistory,
            dividendViewMode: "current",
            selectedDividendYear: "2025/76",
            portfolios,
            portfolio,
            shareTransactions,
            scripNamesMap: { AAA: "AAA Limited", BBB: "BBB Limited" },
            includedPortfolioIds: new Set(["p1"]),
            getFaceValue: () => 100,
        })

        expect(currentResult.dividendPortfolioRows[0]?.topCashContributor?.symbol).toBe("AAA")
        expect(currentResult.dividendPortfolioRows[0]?.topBonusContributor?.symbol).toBe("BBB")
    })

    it("rolls up all matching years in all mode", () => {
        const dividendHistory: ProposedDividendRecord[] = [
            {
                id: 1,
                symbol: "NABIL",
                company_name: "Nabil Bank Limited",
                cash_dividend: "10",
                bonus_share: "0",
                fiscal_year: "2024/75",
                announcement_date: "2024-08-01",
            },
            {
                id: 2,
                symbol: "NABIL",
                company_name: "Nabil Bank Limited",
                cash_dividend: "5",
                bonus_share: "10",
                fiscal_year: "2025/76",
                announcement_date: "2025-08-01",
            },
        ]

        const portfolios: Portfolio[] = [
            { id: "p1", name: "Main", description: "", color: "#000", includeInTotals: true, isDefault: true, createdAt: "2024-01-01" },
        ]

        const portfolio: PortfolioItem[] = [
            {
                id: "h1",
                portfolioId: "p1",
                symbol: "NABIL",
                assetName: "Nabil Bank Limited",
                units: 10,
                buyPrice: 1000,
                assetType: "stock",
            },
        ]

        const shareTransactions: ShareTransaction[] = [
            {
                id: "t1",
                portfolioId: "p1",
                symbol: "NABIL",
                quantity: 10,
                price: 1000,
                type: "buy",
                date: "2024-01-10",
                assetType: "stock",
                description: "",
            },
        ]

        const result = buildDividendData({
            dividendHistory,
            dividendViewMode: "all",
            selectedDividendYear: "2025/76",
            portfolios,
            portfolio,
            shareTransactions,
            scripNamesMap: { NABIL: "Nabil Bank Limited" },
            includedPortfolioIds: new Set(["p1"]),
            getFaceValue: () => 100,
        })

        expect(result.dividendAllYearsRows).toHaveLength(1)
        expect(result.dividendAllYearsRows[0]?.years.map((entry) => entry.year)).toEqual(["2025/76", "2024/75"])
        expect(result.dividendOverviewTotals.estimatedCash).toBe(150)
        expect(result.dividendOverviewTotals.estimatedBonusUnits).toBe(1)
        expect(result.dividendAllYearsRows[0]?.topCashContributor?.symbol).toBe("NABIL")
        expect(result.dividendAllYearsRows[0]?.topBonusContributor?.symbol).toBe("NABIL")
    })

    it("tracks best cash and bonus contributors separately in all mode", () => {
        const dividendHistory: ProposedDividendRecord[] = [
            {
                id: 1,
                symbol: "AAA",
                company_name: "AAA Limited",
                cash_dividend: "20",
                bonus_share: "0",
                fiscal_year: "2025/76",
                announcement_date: "2025-08-01",
            },
            {
                id: 2,
                symbol: "BBB",
                company_name: "BBB Limited",
                cash_dividend: "2",
                bonus_share: "20",
                fiscal_year: "2025/76",
                announcement_date: "2025-08-02",
            },
        ]

        const portfolios: Portfolio[] = [
            { id: "p1", name: "Main", description: "", color: "#000", includeInTotals: true, isDefault: true, createdAt: "2024-01-01" },
        ]

        const portfolio: PortfolioItem[] = [
            { id: "h1", portfolioId: "p1", symbol: "AAA", assetName: "AAA Limited", units: 10, buyPrice: 1000, assetType: "stock" },
            { id: "h2", portfolioId: "p1", symbol: "BBB", assetName: "BBB Limited", units: 10, buyPrice: 1000, assetType: "stock" },
        ]

        const shareTransactions: ShareTransaction[] = [
            { id: "t1", portfolioId: "p1", symbol: "AAA", quantity: 10, price: 1000, type: "buy", date: "2024-01-10", assetType: "stock", description: "" },
            { id: "t2", portfolioId: "p1", symbol: "BBB", quantity: 10, price: 1000, type: "buy", date: "2024-01-10", assetType: "stock", description: "" },
        ]

        const result = buildDividendData({
            dividendHistory,
            dividendViewMode: "all",
            selectedDividendYear: "2025/76",
            portfolios,
            portfolio,
            shareTransactions,
            scripNamesMap: { AAA: "AAA Limited", BBB: "BBB Limited" },
            includedPortfolioIds: new Set(["p1"]),
            getFaceValue: () => 100,
        })

        expect(result.dividendAllYearsRows[0]?.topCashContributor?.symbol).toBe("AAA")
        expect(result.dividendAllYearsRows[0]?.topCashContributor?.estimatedCash).toBe(200)
        expect(result.dividendAllYearsRows[0]?.topBonusContributor?.symbol).toBe("BBB")
        expect(result.dividendAllYearsRows[0]?.topBonusContributor?.estimatedBonusUnits).toBe(2)
    })
})
