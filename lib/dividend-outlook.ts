import { Portfolio, PortfolioItem, ShareTransaction } from "@/types/wallet"
import { normalizeStockSymbol } from "@/lib/stock-symbol"

export type ProposedDividendRecord = {
    id: number
    symbol: string
    company_name: string
    cash_dividend?: string
    bonus_share?: string
    fiscal_year?: string
    announcement_date?: string
    scraped_at?: string
}

export type DividendViewMode = "historical" | "current" | "all"

export type DividendHoldingSummary = {
    symbol: string
    assetName: string
    units: number
    cashPercent: number
    bonusPercent: number
    estimatedCash: number
    estimatedBonusUnits: number
    announcementDate?: string
}

export type DividendPortfolioSummaryRow = {
    portfolioId: string
    portfolioName: string
    includeInTotals: boolean
    holdingsCount: number
    matchedCount: number
    estimatedCash: number
    estimatedBonusUnits: number
    holdings: DividendHoldingSummary[]
}

export type DividendYearSummary = {
    year: string
    estimatedCash: number
    estimatedBonusUnits: number
    holdingsCount: number
    matchedCount: number
}

export type DividendPortfolioAllYearsRow = {
    portfolioId: string
    portfolioName: string
    includeInTotals: boolean
    totalEstimatedCash: number
    totalEstimatedBonusUnits: number
    years: DividendYearSummary[]
}

export type DividendOverviewTotals = {
    portfolios: number
    holdings: number
    matched: number
    estimatedCash: number
    estimatedBonusUnits: number
}

export type StockTransactionCatalogEntry = {
    portfolioId: string
    symbol: string
    assetName: string
    sector?: string
    currentUnits: number
}

type TransactionHistoryEntry = {
    dateTs: number
    quantity: number
    type: ShareTransaction["type"]
}

type BuildDividendDataOptions = {
    dividendHistory: ProposedDividendRecord[] | null
    dividendViewMode: DividendViewMode
    selectedDividendYear: string
    portfolios: Portfolio[]
    portfolio: PortfolioItem[]
    shareTransactions: ShareTransaction[]
    scripNamesMap: Record<string, string>
    includedPortfolioIds: Set<string>
    getFaceValue: (symbol: string) => number
}

const parseDateToTimestamp = (value?: string) => {
    if (!value) return null
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
}

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

export const getFiscalYearSortValue = (value?: string) => {
    if (!value) return Number.NEGATIVE_INFINITY
    const match = value.match(/\d{4}/)
    return match ? Number(match[0]) : Number.NEGATIVE_INFINITY
}

export const getDefaultDividendYear = (years: string[]) => {
    if (years.length === 0) return ""
    const currentYear = new Date().getFullYear()
    const latestCompletedYear = years.find((year) => {
        const sortValue = getFiscalYearSortValue(year)
        return Number.isFinite(sortValue) && sortValue < currentYear
    })
    return latestCompletedYear || years[0]
}

export const getDividendEligibleHoldings = (portfolio: PortfolioItem[]) =>
    portfolio.filter((item) => (item.assetType || "stock") === "stock" && !item.cryptoId && item.units > 0)

export const buildStockTransactionCatalog = (
    portfolio: PortfolioItem[],
    shareTransactions: ShareTransaction[],
    scripNamesMap: Record<string, string>,
) => {
    const map = new Map<string, StockTransactionCatalogEntry>()

    portfolio
        .filter((item) => (item.assetType || "stock") === "stock" && !item.cryptoId)
        .forEach((item) => {
            const normalizedSymbol = normalizeStockSymbol(item.symbol)
            const key = `${item.portfolioId}|${normalizedSymbol}`
            map.set(key, {
                portfolioId: item.portfolioId,
                symbol: normalizedSymbol || item.symbol,
                assetName: scripNamesMap[normalizedSymbol] || item.assetName || item.symbol,
                sector: item.sector,
                currentUnits: item.units || 0,
            })
        })

    shareTransactions
        .filter((tx) => (tx.assetType || "stock") === "stock" && !tx.cryptoId)
        .forEach((tx) => {
            const normalizedSymbol = normalizeStockSymbol(tx.symbol)
            const key = `${tx.portfolioId}|${normalizedSymbol}`
            if (!map.has(key)) {
                map.set(key, {
                    portfolioId: tx.portfolioId,
                    symbol: normalizedSymbol || tx.symbol,
                    assetName: scripNamesMap[normalizedSymbol] || tx.symbol,
                    sector: undefined,
                    currentUnits: 0,
                })
            }
        })

    return Array.from(map.values())
}

export const getAvailableDividendYears = (dividendHistory: ProposedDividendRecord[] | null) => {
    const years = Array.from(
        new Set(
            (dividendHistory || [])
                .map((record) => (record.fiscal_year || "").trim())
                .filter(Boolean),
        ),
    )
    return years.sort((a, b) => getFiscalYearSortValue(b) - getFiscalYearSortValue(a) || b.localeCompare(a))
}

export const getSelectedYearDividendHistory = (
    dividendHistory: ProposedDividendRecord[] | null,
    selectedDividendYear: string,
) => {
    if (!selectedDividendYear) return []
    return (dividendHistory || [])
        .filter((record) => (record.fiscal_year || "").trim() === selectedDividendYear)
        .sort((a, b) => {
            const left = parseDateToTimestamp(a.announcement_date) ?? Number.NEGATIVE_INFINITY
            const right = parseDateToTimestamp(b.announcement_date) ?? Number.NEGATIVE_INFINITY
            return right - left
        })
}

export const matchDividendRecordForHolding = (
    symbol: string,
    assetName: string,
    records: ProposedDividendRecord[],
) => {
    const normalizedSymbol = normalizeStockSymbol(symbol)
    const normalizedHoldingName = normalizeCompany(assetName || symbol)
    return records.find((record) => {
        const recordSymbol = normalizeStockSymbol(record.symbol)
        if (normalizedSymbol && recordSymbol === normalizedSymbol) return true
        const recordName = normalizeCompany(record.company_name)
        return Boolean(normalizedHoldingName && recordName && (recordName.includes(normalizedHoldingName) || normalizedHoldingName.includes(recordName)))
    })
}

const buildTransactionHistoryMap = (shareTransactions: ShareTransaction[]) => {
    const map = new Map<string, TransactionHistoryEntry[]>()

    shareTransactions
        .filter((tx) => (tx.assetType || "stock") === "stock" && !tx.cryptoId)
        .forEach((tx) => {
            const normalizedSymbol = normalizeStockSymbol(tx.symbol)
            const dateTs = parseDateToTimestamp(tx.date)
            if (!normalizedSymbol || !Number.isFinite(dateTs)) return

            const key = `${tx.portfolioId}|${normalizedSymbol}`
            const entries = map.get(key) || []
            entries.push({
                dateTs: dateTs as number,
                quantity: Number.isFinite(tx.quantity) ? tx.quantity : 0,
                type: tx.type,
            })
            map.set(key, entries)
        })

    map.forEach((entries) => {
        entries.sort((a, b) => a.dateTs - b.dateTs)
    })

    return map
}

export const getUnitsHeldForDividendDate = (
    transactionHistoryMap: Map<string, TransactionHistoryEntry[]>,
    portfolioId: string,
    symbol: string,
    cutoffDate?: string,
) => {
    if (!cutoffDate) return 0
    const cutoffTs = parseDateToTimestamp(cutoffDate)
    if (!Number.isFinite(cutoffTs)) return 0

    const entries = transactionHistoryMap.get(`${portfolioId}|${normalizeStockSymbol(symbol)}`) || []
    let units = 0
    for (const entry of entries) {
        if (entry.dateTs > (cutoffTs as number)) break
        if (entry.type === "buy" || entry.type === "ipo" || entry.type === "reinvestment" || entry.type === "bonus" || entry.type === "gift" || entry.type === "merger_in") {
            units += entry.quantity
        } else if (entry.type === "sell" || entry.type === "merger_out") {
            units -= entry.quantity
        }
    }
    return Number(units.toFixed(4))
}

export const buildDividendData = ({
    dividendHistory,
    dividendViewMode,
    selectedDividendYear,
    portfolios,
    portfolio,
    shareTransactions,
    scripNamesMap,
    includedPortfolioIds,
    getFaceValue,
}: BuildDividendDataOptions) => {
    const dividendEligibleHoldings = getDividendEligibleHoldings(portfolio)
    const stockTransactionCatalog = buildStockTransactionCatalog(portfolio, shareTransactions, scripNamesMap)
    const availableDividendYears = getAvailableDividendYears(dividendHistory)
    const selectedYearDividendHistory = getSelectedYearDividendHistory(dividendHistory, selectedDividendYear)
    const transactionHistoryMap = buildTransactionHistoryMap(shareTransactions)
    const portfolioNameById = new Map(portfolios.map((entry) => [entry.id, entry.name]))

    const dividendSummaryByPortfolio = (() => {
        const sourceHoldings = dividendViewMode === "current"
            ? dividendEligibleHoldings.map((item) => ({
                portfolioId: item.portfolioId,
                symbol: normalizeStockSymbol(item.symbol) || item.symbol,
                assetName: scripNamesMap[normalizeStockSymbol(item.symbol)] || item.assetName || item.symbol,
                sector: item.sector,
                units: item.units || 0,
                matchedRecord: matchDividendRecordForHolding(
                    item.symbol,
                    scripNamesMap[normalizeStockSymbol(item.symbol)] || item.assetName || item.symbol,
                    selectedYearDividendHistory,
                ),
            }))
            : stockTransactionCatalog.map((item) => {
                const matchedRecord = matchDividendRecordForHolding(item.symbol, item.assetName || item.symbol, selectedYearDividendHistory)
                const units = matchedRecord
                    ? getUnitsHeldForDividendDate(transactionHistoryMap, item.portfolioId, item.symbol, matchedRecord.announcement_date || matchedRecord.scraped_at)
                    : 0
                return {
                    ...item,
                    units,
                    matchedRecord,
                }
            })

        return sourceHoldings
            .filter((item) => item.units > 0)
            .reduce((acc, item) => {
                const cashPercent = parsePositiveNumber(item.matchedRecord?.cash_dividend)
                const bonusPercent = parsePositiveNumber(item.matchedRecord?.bonus_share)
                const faceValue = item.sector === "Mutual Fund" ? 10 : getFaceValue(item.symbol)
                const estimatedCash = Number(((item.units * faceValue * cashPercent) / 100).toFixed(2))
                const estimatedBonusUnits = Number(((item.units * bonusPercent) / 100).toFixed(4))
                const portfolioId = item.portfolioId
                const existing = acc.get(portfolioId) || {
                    portfolioId,
                    portfolioName: portfolioNameById.get(portfolioId) || "Portfolio",
                    includeInTotals: includedPortfolioIds.has(portfolioId),
                    holdingsCount: 0,
                    matchedCount: 0,
                    estimatedCash: 0,
                    estimatedBonusUnits: 0,
                    holdings: [] as DividendHoldingSummary[],
                }

                existing.holdingsCount += 1
                if (item.matchedRecord) {
                    existing.matchedCount += 1
                }
                existing.estimatedCash += estimatedCash
                existing.estimatedBonusUnits += estimatedBonusUnits
                existing.holdings.push({
                    symbol: item.symbol,
                    assetName: item.assetName,
                    units: item.units,
                    cashPercent,
                    bonusPercent,
                    estimatedCash,
                    estimatedBonusUnits,
                    announcementDate: item.matchedRecord?.announcement_date,
                })

                acc.set(portfolioId, existing)
                return acc
            }, new Map<string, DividendPortfolioSummaryRow>())
    })()

    const dividendPortfolioRows = Array.from(dividendSummaryByPortfolio.values())
        .sort((a, b) =>
            Number(b.includeInTotals) - Number(a.includeInTotals) ||
            b.estimatedCash - a.estimatedCash ||
            a.portfolioName.localeCompare(b.portfolioName),
        )

    const historyByYear = availableDividendYears.reduce((acc, year) => {
        const records = (dividendHistory || [])
            .filter((record) => (record.fiscal_year || "").trim() === year)
            .sort((a, b) => {
                const left = parseDateToTimestamp(a.announcement_date) ?? Number.NEGATIVE_INFINITY
                const right = parseDateToTimestamp(b.announcement_date) ?? Number.NEGATIVE_INFINITY
                return right - left
            })
        acc.set(year, records)
        return acc
    }, new Map<string, ProposedDividendRecord[]>())

    const allYearsRowsMap = new Map<string, DividendPortfolioAllYearsRow>()
    stockTransactionCatalog.forEach((holding) => {
        const yearSummaries: DividendYearSummary[] = []

        availableDividendYears.forEach((year) => {
            const yearRecords = historyByYear.get(year) || []
            const matchedRecord = matchDividendRecordForHolding(holding.symbol, holding.assetName || holding.symbol, yearRecords)
            if (!matchedRecord) return

            const units = getUnitsHeldForDividendDate(
                transactionHistoryMap,
                holding.portfolioId,
                holding.symbol,
                matchedRecord.announcement_date || matchedRecord.scraped_at,
            )
            if (units <= 0) return

            const cashPercent = parsePositiveNumber(matchedRecord.cash_dividend)
            const bonusPercent = parsePositiveNumber(matchedRecord.bonus_share)
            const faceValue = holding.sector === "Mutual Fund" ? 10 : getFaceValue(holding.symbol)
            const estimatedCash = Number(((units * faceValue * cashPercent) / 100).toFixed(2))
            const estimatedBonusUnits = Number(((units * bonusPercent) / 100).toFixed(4))

            yearSummaries.push({
                year,
                estimatedCash,
                estimatedBonusUnits,
                holdingsCount: 1,
                matchedCount: 1,
            })
        })

        if (yearSummaries.length === 0) return

        const portfolioId = holding.portfolioId
        const existing = allYearsRowsMap.get(portfolioId) || {
            portfolioId,
            portfolioName: portfolioNameById.get(portfolioId) || "Portfolio",
            includeInTotals: includedPortfolioIds.has(portfolioId),
            totalEstimatedCash: 0,
            totalEstimatedBonusUnits: 0,
            years: [],
        }

        yearSummaries.forEach((summary) => {
            const existingYear = existing.years.find((entry) => entry.year === summary.year)
            if (existingYear) {
                existingYear.estimatedCash += summary.estimatedCash
                existingYear.estimatedBonusUnits += summary.estimatedBonusUnits
                existingYear.holdingsCount += summary.holdingsCount
                existingYear.matchedCount += summary.matchedCount
            } else {
                existing.years.push({ ...summary })
            }
            existing.totalEstimatedCash += summary.estimatedCash
            existing.totalEstimatedBonusUnits += summary.estimatedBonusUnits
        })

        existing.years.sort((a, b) => getFiscalYearSortValue(b.year) - getFiscalYearSortValue(a.year) || b.year.localeCompare(a.year))
        allYearsRowsMap.set(portfolioId, existing)
    })

    const dividendAllYearsRows = Array.from(allYearsRowsMap.values()).sort((a, b) =>
        Number(b.includeInTotals) - Number(a.includeInTotals) ||
        b.totalEstimatedCash - a.totalEstimatedCash ||
        a.portfolioName.localeCompare(b.portfolioName),
    )

    const dividendOverviewTotals: DividendOverviewTotals = dividendViewMode === "all"
        ? dividendAllYearsRows
            .filter((row) => row.includeInTotals)
            .reduce((sum, row) => ({
                portfolios: sum.portfolios + 1,
                holdings: sum.holdings + row.years.reduce((inner, year) => inner + year.holdingsCount, 0),
                matched: sum.matched + row.years.reduce((inner, year) => inner + year.matchedCount, 0),
                estimatedCash: sum.estimatedCash + row.totalEstimatedCash,
                estimatedBonusUnits: sum.estimatedBonusUnits + row.totalEstimatedBonusUnits,
            }), {
                portfolios: 0,
                holdings: 0,
                matched: 0,
                estimatedCash: 0,
                estimatedBonusUnits: 0,
            })
        : dividendPortfolioRows
            .filter((row) => row.includeInTotals)
            .reduce((sum, row) => ({
                portfolios: sum.portfolios + 1,
                holdings: sum.holdings + row.holdingsCount,
                matched: sum.matched + row.matchedCount,
                estimatedCash: sum.estimatedCash + row.estimatedCash,
                estimatedBonusUnits: sum.estimatedBonusUnits + row.estimatedBonusUnits,
            }), {
                portfolios: 0,
                holdings: 0,
                matched: 0,
                estimatedCash: 0,
                estimatedBonusUnits: 0,
            })

    return {
        dividendEligibleHoldings,
        availableDividendYears,
        selectedYearDividendHistory,
        dividendPortfolioRows,
        dividendAllYearsRows,
        dividendOverviewTotals,
    }
}
