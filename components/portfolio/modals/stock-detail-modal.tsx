"use client"

import type { PortfolioItem, ShareTransaction, NepseDisclosure, NepseExchangeMessage } from "@/types/wallet"
import { Dialog, DialogContent,DialogDescription,DialogHeader,DialogTitle,} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {Activity,BarChart3,TrendingDown,TrendingUp,Info,Clock,ExternalLink,X,ArrowUpRight,ArrowDownLeft,Gift,PiggyBank,CheckCircle2,Wallet,Trash2,RefreshCcw,Edit3,MoreVertical,Search,SlidersHorizontal} from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeStockSymbol } from "@/lib/stock-symbol"
import { isMarketSearchDetailItem } from "@/lib/market-stock-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useEffect, useState, useMemo, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipProvider as UITooltipProvider, TooltipTrigger as UITooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ZoomIn, ZoomOut } from "lucide-react"
import { SIPSetupModal } from "./sip-setup-modal"
import { EditTransactionModal } from "./edit-transaction-modal"
import { AddTransactionModal, type TransactionDraft } from "./add-transaction-modal"
import { SIP_DEFAULT_DPS_CHARGE, canSipCycleBuyUnit, formatSipDate, getSipBaseAmount, getSipCarryRemainder, getSipCompletedTransactionForDueDate, getSipCycleAmounts, getSipDisplayTransactionsForPlan, getSipScheduleSummary, getSipTransactionGrossAmount, getSipTransactionNetAmount, isSipEnrollmentCandidate, normalizeSipPlans } from "@/lib/sip"
import { toast } from "sonner"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { adToBsDateKey, formatAppDate } from "@/lib/app-calendar"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type ProposedDividendRecord = {
    id: number
    symbol: string
    company_name: string
    cash_dividend?: string
    bonus_share?: string
    fiscal_year?: string
    announcement_date?: string
    scraped_at?: string
}

type BtcNewsItem = {
    id: string
    title: string
    link: string
    publishedAt?: string
    summary?: string
    author?: string
    categories?: string[]
}

type StockNewsItem = (NepseDisclosure | NepseExchangeMessage) & {
    sourceType?: "company" | "disclosure" | "exchange"
}

type LtpHistoryPoint = {
    date: string
    ltp: number
    volume?: number
    turnover?: number
    trades?: number
    points?: number
}

type CompanyProfile = {
    id?: number
    symbol: string
    profile?: string
    email?: string
    phone?: string
    fax?: string
    contact_person?: string
    address_type?: string
    address?: string
    logo_path?: string
}

type CompanyFinancialDocument = {
    submitted_date?: string
    path?: string
    url?: string
}

type CompanyFinancialReport = {
    type?: string
    quarter?: string
    fy?: string
    fy_nepali?: string
    pe?: number
    eps?: number
    paid_up_capital?: number
    profit?: number
    net_worth_per_share?: number
    documents?: CompanyFinancialDocument[]
}

type CompanyFinancialMetadata = {
    last_updated?: string
    source?: string
    count?: number
    document_base_url?: string
}

const formatFinancialReportLabel = (report: CompanyFinancialReport) =>
    [report.quarter || report.type || "Report", report.fy_nepali || report.fy, report.documents?.[0]?.submitted_date]
        .filter(Boolean)
        .join(" / ")

const getFinancialReportKey = (report: CompanyFinancialReport, index: number) => [
    report.type || "report",
    report.fy || "fy",
    report.fy_nepali || "fy-nepali",
    report.quarter || "annual",
    report.documents?.[0]?.path || report.documents?.[0]?.url || report.documents?.[0]?.submitted_date || index,
    index,
].join("-")

const getNepaliFiscalYearForDate = (date: Date = new Date()) => {
    const bsDate = adToBsDateKey(date)
    const match = bsDate.match(/^(\d{4})-(\d{2})-/)
    if (!match) return ""

    const bsYear = Number(match[1])
    const bsMonth = Number(match[2])
    if (!Number.isFinite(bsYear) || !Number.isFinite(bsMonth)) return ""

    const startYear = bsMonth >= 4 ? bsYear : bsYear - 1
    return `${startYear}-${startYear + 1}`
}

const getAdFiscalYearForDate = (date: Date = new Date()) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const startYear = month >= 6 ? year : year - 1
    return `${startYear}-${startYear + 1}`
}

const getFiscalYearSortValue = (year: string) => {
    const match = year.match(/(\d{4})/)
    return match ? Number(match[1]) : 0
}

type PriceHistoryRange = "1M" | "6M" | "1Y" | "5Y" | "ALL"

const PRICE_HISTORY_RANGES: Array<{ value: PriceHistoryRange; label: string; months: number; grouping: "daily" | "weekly" | "monthly" }> = [
    { value: "1M", label: "1M", months: 1, grouping: "daily" },
    { value: "6M", label: "6M", months: 6, grouping: "weekly" },
    { value: "1Y", label: "1Y", months: 12, grouping: "weekly" },
    { value: "5Y", label: "5Y", months: 60, grouping: "monthly" },
    { value: "ALL", label: "All", months: 120, grouping: "monthly" },
]

const getPriceHistoryRangeConfig = (range: PriceHistoryRange) =>
    PRICE_HISTORY_RANGES.find((option) => option.value === range) || PRICE_HISTORY_RANGES[0]

const getWeekKey = (date: Date) => {
    const firstDayOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
    const dayOfYear = Math.floor((date.getTime() - firstDayOfYear) / 86400000)
    return `${date.getUTCFullYear()}-W${Math.floor(dayOfYear / 7) + 1}`
}

const aggregatePriceHistory = (points: LtpHistoryPoint[], grouping: "daily" | "weekly" | "monthly") => {
    if (grouping === "daily") return points

    const buckets = new Map<string, {
        date: string
        ltpTotal: number
        volumeTotal: number
        turnoverTotal: number
        tradesTotal: number
        hasVolume: boolean
        hasTurnover: boolean
        hasTrades: boolean
        points: number
    }>()

    points.forEach((point) => {
        const parsed = new Date(`${point.date}T00:00:00Z`)
        if (Number.isNaN(parsed.getTime())) return
        const key = grouping === "monthly" ? point.date.slice(0, 7) : getWeekKey(parsed)
        const existing = buckets.get(key) || {
            date: point.date,
            ltpTotal: 0,
            volumeTotal: 0,
            turnoverTotal: 0,
            tradesTotal: 0,
            hasVolume: false,
            hasTurnover: false,
            hasTrades: false,
            points: 0,
        }

        existing.date = point.date
        existing.ltpTotal += point.ltp
        existing.points += 1
        if (Number.isFinite(point.volume)) {
            existing.volumeTotal += point.volume || 0
            existing.hasVolume = true
        }
        if (Number.isFinite(point.turnover)) {
            existing.turnoverTotal += point.turnover || 0
            existing.hasTurnover = true
        }
        if (Number.isFinite(point.trades)) {
            existing.tradesTotal += point.trades || 0
            existing.hasTrades = true
        }
        buckets.set(key, existing)
    })

    return Array.from(buckets.values())
        .map((bucket) => ({
            date: bucket.date,
            ltp: bucket.points > 0 ? bucket.ltpTotal / bucket.points : 0,
            volume: bucket.hasVolume ? bucket.volumeTotal : undefined,
            turnover: bucket.hasTurnover ? bucket.turnoverTotal : undefined,
            trades: bucket.hasTrades ? bucket.tradesTotal : undefined,
            points: bucket.points,
        }))
        .filter((point) => point.ltp > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
}

const formatOrdinalInstallment = (value: number) => {
    const remainder10 = value % 10
    const remainder100 = value % 100

    if (remainder10 === 1 && remainder100 !== 11) return `${value}st`
    if (remainder10 === 2 && remainder100 !== 12) return `${value}nd`
    if (remainder10 === 3 && remainder100 !== 13) return `${value}rd`
    return `${value}th`
}

interface StockDetailModalProps {
    item: PortfolioItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: "holding" | "sold"
}

export function StockDetailModal({ item: initialItem, open, onOpenChange, mode = "holding" }: StockDetailModalProps) {
    const { userProfile, portfolio, scripNamesMap, shareTransactions, noticesBundle, disclosures, exchangeMessages, getFaceValue, completeSipInstallment, deleteShareTransaction, updateShareTransaction, addShareTransaction } = useWalletData()
    const [isDividendHistoryLoading, setIsDividendHistoryLoading] = useState(false)
    const [dividendHistoryError, setDividendHistoryError] = useState<string | null>(null)
    const [dividendHistory, setDividendHistory] = useState<ProposedDividendRecord[] | null>(null)
    const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null)
    const [showCashInfo, setShowCashInfo] = useState(false)
    const [showBonusInfo, setShowBonusInfo] = useState(false)
    const [selectedDividendKey, setSelectedDividendKey] = useState<string | null>(null)
    const [isWhatIfOpen, setIsWhatIfOpen] = useState(false)
    const [whatIfQuery, setWhatIfQuery] = useState("")
    const [whatIfUnits, setWhatIfUnits] = useState("")
    const [isWhatIfSearchFocused, setIsWhatIfSearchFocused] = useState(false)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [pdfSourceUrl, setPdfSourceUrl] = useState<string | null>(null)
    const [isPdfOpen, setIsPdfOpen] = useState(false)
    const [isSipModalOpen, setIsSipModalOpen] = useState(false)
    const [initialEnrollmentTransactionId, setInitialEnrollmentTransactionId] = useState<string | null>(null)
    const [isCompletingSip, setIsCompletingSip] = useState(false)
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)
    const [editingTransaction, setEditingTransaction] = useState<ShareTransaction | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")
    const [showCompanyDetails, setShowCompanyDetails] = useState(false)
    const [transactionMode, setTransactionMode] = useState<"buy" | "sell" | null>(null)
    const [isInlineTransactionSaving, setIsInlineTransactionSaving] = useState(false)
    const [inlineTransaction, setInlineTransaction] = useState<TransactionDraft>({
        symbol: "",
        assetType: "stock",
        cryptoId: "",
        quantity: Number.NaN,
        price: Number.NaN,
        type: "buy",
        date: new Date().toISOString().split("T")[0],
        description: "",
    })
    const [btcNews, setBtcNews] = useState<BtcNewsItem[]>([])
    const [isBtcNewsLoading, setIsBtcNewsLoading] = useState(false)
    const [btcNewsError, setBtcNewsError] = useState<string | null>(null)
    const [priceHistory, setPriceHistory] = useState<LtpHistoryPoint[]>([])
    const [priceHistoryRange, setPriceHistoryRange] = useState<PriceHistoryRange>("1M")
    const [priceHistoryCache, setPriceHistoryCache] = useState<Partial<Record<PriceHistoryRange, LtpHistoryPoint[]>>>({})
    const [isPriceHistoryLoading, setIsPriceHistoryLoading] = useState(false)
    const [priceHistoryError, setPriceHistoryError] = useState<string | null>(null)
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
    const [companyProfileLoadedSymbol, setCompanyProfileLoadedSymbol] = useState("")
    const [isCompanyProfileLoading, setIsCompanyProfileLoading] = useState(false)
    const [companyProfileError, setCompanyProfileError] = useState<string | null>(null)
    const [financialReports, setFinancialReports] = useState<CompanyFinancialReport[]>([])
    const [financialReportsLoadedSymbol, setFinancialReportsLoadedSymbol] = useState("")
    const [financialCompareReportKey, setFinancialCompareReportKey] = useState("")
    const [isFinancialCompareOpen, setIsFinancialCompareOpen] = useState(false)
    const [financialMetadata, setFinancialMetadata] = useState<CompanyFinancialMetadata | null>(null)
    const [isFinancialReportsLoading, setIsFinancialReportsLoading] = useState(false)
    const [financialReportsError, setFinancialReportsError] = useState<string | null>(null)
    const [pdfZoom, setPdfZoom] = useState(1)
    const calendarSystem = useCalendarSystem()

    const item = useMemo(() => {
        if (!initialItem) return null

        const initialSymbol = normalizeStockSymbol(initialItem.symbol)
        const initialAssetType = initialItem.assetType || "stock"
        const initialCryptoId = (initialItem.cryptoId || "").trim()

        return portfolio.find((entry) => {
            const entrySymbol = normalizeStockSymbol(entry.symbol)
            const entryAssetType = entry.assetType || "stock"
            const entryCryptoId = (entry.cryptoId || "").trim()
            return (
                entry.portfolioId === initialItem.portfolioId &&
                entrySymbol === initialSymbol &&
                entryAssetType === initialAssetType &&
                entryCryptoId === initialCryptoId
            )
        }) || initialItem
    }, [initialItem, portfolio])

    const isPdfLink = (url: string) => /\.pdf(\?|#|$)/i.test(url)

    useEffect(() => {
        if (!open || typeof document === "undefined") return
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [open])

    useEffect(() => {
        if (!open) {
            setShowCashInfo(false)
            setShowBonusInfo(false)
            setSelectedDividendKey(null)
            setIsWhatIfOpen(false)
            setWhatIfQuery("")
            setWhatIfUnits("")
            setIsWhatIfSearchFocused(false)
            setIsPdfOpen(false)
            setIsSipModalOpen(false)
            setActiveTab(mode === "sold" ? "sold" : "overview")
            setPdfUrl(null)
            setPdfSourceUrl(null)
            setPriceHistory([])
            setPriceHistoryRange("1M")
            setPriceHistoryCache({})
            setPriceHistoryError(null)
            setShowCompanyDetails(false)
            setCompanyProfile(null)
            setCompanyProfileLoadedSymbol("")
            setCompanyProfileError(null)
            setFinancialReports([])
            setFinancialReportsLoadedSymbol("")
            setFinancialCompareReportKey("")
            setIsFinancialCompareOpen(false)
            setFinancialMetadata(null)
            setFinancialReportsError(null)
            setTransactionMode(null)
            setIsInlineTransactionSaving(false)
        }
    }, [open, mode])

    useEffect(() => {
        if (open) setActiveTab(mode === "sold" ? "sold" : "overview")
        setPriceHistory([])
        setPriceHistoryRange("1M")
        setPriceHistoryCache({})
        setPriceHistoryError(null)
        setShowCompanyDetails(false)
        setCompanyProfile(null)
        setCompanyProfileLoadedSymbol("")
        setCompanyProfileError(null)
        setFinancialReports([])
        setFinancialReportsLoadedSymbol("")
        setFinancialCompareReportKey("")
        setIsFinancialCompareOpen(false)
        setFinancialMetadata(null)
        setFinancialReportsError(null)
        setTransactionMode(null)
        setInlineTransaction({
            symbol: "",
            assetType: "stock",
            cryptoId: "",
            quantity: Number.NaN,
            price: Number.NaN,
            type: "buy",
            date: new Date().toISOString().split("T")[0],
            description: "",
        })
    }, [open, mode, initialItem?.id])

    const isCrypto = Boolean(item && (item.assetType === "crypto" || item.cryptoId))
    const isMarketLookupItem = Boolean(item && isMarketSearchDetailItem(item))
    const isSoldDetailMode = mode === "sold"
    const isBitcoin = Boolean(
        isCrypto &&
        item &&
        (item.symbol?.trim().toUpperCase() === "BTC" ||
            (item.cryptoId || "").toLowerCase() === "bitcoin" ||
            (item.assetName || "").toLowerCase().includes("bitcoin"))
    )
    const currencySymbol = isCrypto ? "$" : "रु"
    const isZeroHolding = !isMarketLookupItem && ((item?.units ?? 0) === 0 || item?.isKeptZeroHolding)
    const safeBuyPrice = Number.isFinite(item?.buyPrice) ? (item?.buyPrice ?? 0) : 0
    const safeCurrent = Number.isFinite(item?.currentPrice) ? (item?.currentPrice ?? safeBuyPrice) : safeBuyPrice
    const current = safeCurrent
    const investment = (item?.units ?? 0) * safeBuyPrice
    const value = (item?.units ?? 0) * current
    const profitLoss = value - investment
    const profitLossPerc = investment > 0 ? (profitLoss / investment) * 100 : 0
    const hasCostBasis = investment > 0
    const isProfit = profitLoss >= 0
    const lastExitInfo = useMemo(() => {
        if (!isZeroHolding || !item || isMarketLookupItem) return null
        const relevantTxs = shareTransactions.filter(
            (tx) =>
                tx.portfolioId === item.portfolioId &&
                normalizeStockSymbol(tx.symbol) === normalizeStockSymbol(item.symbol) &&
                tx.assetType === (item.assetType || "stock") &&
                (tx.cryptoId || "") === (item.cryptoId || "")
        )
        const exitTxs = relevantTxs
            .filter((tx) => tx.type === "sell" || tx.type === "merger_out")
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        return exitTxs[0]
    }, [isMarketLookupItem, isZeroHolding, item, shareTransactions])
    const isSold = lastExitInfo?.type === "sell"
    const isMerged = lastExitInfo?.type === "merger_out"
    const safePreviousClose = Number.isFinite(item?.previousClose) ? (item?.previousClose ?? safeCurrent) : safeCurrent
    const dailyChange = !isZeroHolding && Number.isFinite(item?.change) ? (item?.change ?? 0) : (safeCurrent - safePreviousClose)
    const dailyChangePerc = !isZeroHolding && Number.isFinite(item?.percentChange)
        ? (item?.percentChange ?? 0)
        : (safePreviousClose !== 0 ? (dailyChange / safePreviousClose) * 100 : 0)
    const isDailyNeutral = dailyChange === 0 && dailyChangePerc === 0
    const isDailyProfit = dailyChange > 0
    const companyName = item
        ? (isCrypto ? (item.assetName || item.symbol) : (scripNamesMap[normalizeStockSymbol(item.symbol)] || item.assetName || item.symbol))
        : ""
    const inlineStockOptions = useMemo(() => {
        if (!item || isCrypto) return []
        return [{
            symbol: normalizeStockSymbol(item.symbol),
            name: companyName || item.symbol,
        }]
    }, [companyName, isCrypto, item])
    const inlinePortfolioStockOptions = useMemo(() => {
        const seen = new Set<string>()
        return portfolio
            .filter((entry) => entry.portfolioId === item?.portfolioId && (entry.assetType || "stock") === "stock" && entry.units > 0)
            .map((entry) => {
                const symbol = normalizeStockSymbol(entry.symbol)
                return {
                    symbol,
                    name: scripNamesMap[symbol] || entry.assetName || entry.symbol,
                }
            })
            .filter((entry) => {
                if (!entry.symbol || seen.has(entry.symbol)) return false
                seen.add(entry.symbol)
                return true
            })
    }, [item?.portfolioId, portfolio, scripNamesMap])
    const inlinePortfolioCryptoOptions = useMemo(() =>
        portfolio
            .filter((entry) => entry.portfolioId === item?.portfolioId && (entry.assetType === "crypto" || entry.cryptoId) && entry.units > 0)
            .map((entry) => ({
                id: entry.cryptoId,
                symbol: entry.symbol,
                name: entry.assetName,
            })),
    [item?.portfolioId, portfolio])
    const inlineSellReferenceHolding = useMemo(() => {
        if (!item || inlineTransaction.type !== "sell") return null
        const normalizedSymbol = normalizeStockSymbol(inlineTransaction.symbol)
        if (!normalizedSymbol) return null

        return portfolio.find((entry) => (
            entry.portfolioId === item.portfolioId &&
            (inlineTransaction.assetType === "crypto" || inlineTransaction.cryptoId
                ? ((entry.assetType === "crypto" || Boolean(entry.cryptoId)) &&
                    ((inlineTransaction.cryptoId && entry.cryptoId === inlineTransaction.cryptoId) || normalizeStockSymbol(entry.symbol) === normalizedSymbol))
                : ((entry.assetType || "stock") === "stock" && normalizeStockSymbol(entry.symbol) === normalizedSymbol))
        )) || null
    }, [inlineTransaction.assetType, inlineTransaction.cryptoId, inlineTransaction.symbol, inlineTransaction.type, item, portfolio])
    const inlineSellQuantity = Number(inlineTransaction.quantity)
    const hasInlineSellQuantity = Number.isFinite(inlineSellQuantity) && inlineSellQuantity > 0
    const inlineSellQuantityError = inlineTransaction.type === "sell" && hasInlineSellQuantity && (!inlineSellReferenceHolding || inlineSellQuantity > (inlineSellReferenceHolding.units ?? 0))
    const formatUnits = (units: number) => {
        if (!Number.isFinite(units)) return "0"
        if (units === 0) return "0"
        if (Math.abs(units) < 1) return units.toLocaleString(undefined, { maximumFractionDigits: 10 })
        return units.toLocaleString(undefined, { maximumFractionDigits: 4 })
    }
    const formatTimeSince = (dateValue?: string | number) => {
        if (!dateValue) return "Unknown date"
        const timestamp = typeof dateValue === "number" ? dateValue : new Date(dateValue).getTime()
        if (!Number.isFinite(timestamp)) return "Unknown date"
        const diffMs = Date.now() - timestamp
        const isFuture = diffMs < 0
        const absMs = Math.abs(diffMs)
        const minutes = Math.floor(absMs / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        const months = Math.floor(days / 30)
        const years = Math.floor(days / 365)
        const value = years > 0
            ? `${years}y`
            : months > 0
                ? `${months}mo`
                : days > 0
                    ? `${days}d`
                    : hours > 0
                        ? `${hours}h`
                        : `${Math.max(minutes, 1)}m`
        return isFuture ? `in ${value}` : `${value} ago`
    }
    const formatValue = (amount: number) => {
        if (!Number.isFinite(amount)) return "0"
        if (amount === 0) return "0"
        if (Math.abs(amount) < 1) return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 10 })
        return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    }
    const formatCompactValue = (amount?: number) => {
        if (!Number.isFinite(amount)) return "0"
        return new Intl.NumberFormat(undefined, {
            notation: "compact",
            maximumFractionDigits: 2,
        }).format(amount || 0)
    }
    const formatSignedCurrency = (amount: number) => {
        const sign = amount > 0 ? "+" : amount < 0 ? "-" : ""
        return `${currencySymbol} ${sign}${formatValue(Math.abs(amount))}`
    }

    const priceHistoryStats = useMemo(() => {
        if (priceHistory.length === 0) return null
        const first = priceHistory[0]
        const latest = priceHistory[priceHistory.length - 1]
        const bestEntry = priceHistory.reduce((best, point) => point.ltp < best.ltp ? point : best, first)
        const bestExit = priceHistory.reduce((best, point) => point.ltp > best.ltp ? point : best, first)
        const average = priceHistory.reduce((sum, point) => sum + point.ltp, 0) / priceHistory.length
        const high = bestExit.ltp
        const low = bestEntry.ltp
        const range = high - low
        const rangePosition = range > 0 ? ((latest.ltp - low) / range) * 100 : 50
        const change = latest.ltp - first.ltp
        const changePercent = first.ltp > 0 ? (change / first.ltp) * 100 : 0
        const totalVolume = priceHistory.reduce((sum, point) => sum + (Number.isFinite(point.volume) ? point.volume || 0 : 0), 0)
        const fromBestEntry = bestEntry.ltp > 0 ? ((latest.ltp - bestEntry.ltp) / bestEntry.ltp) * 100 : 0
        const fromBestExit = bestExit.ltp > 0 ? ((latest.ltp - bestExit.ltp) / bestExit.ltp) * 100 : 0
        return {
            first,
            latest,
            bestEntry,
            bestExit,
            average,
            high,
            low,
            rangePosition,
            change,
            changePercent,
            totalVolume,
            fromBestEntry,
            fromBestExit,
        }
    }, [priceHistory])

    const formatProfitLossPercent = (percent: number) => {
        if (!Number.isFinite(percent)) return "N/A"
        return `${percent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`
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

    const stripHtml = (value?: string) => {
        if (!value) return ""
        return value
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, "\"")
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, " ")
            .trim()
    }

    const formatDocumentLabel = (value?: string | null) => {
        const rawLabel = (value || "Document").split("/").pop() || "Document"
        try {
            return decodeURIComponent(rawLabel)
                .replace(/[_-]\d{10,}(?=\.pdf$)/i, "")
                .replace(/\.[a-z0-9]+$/i, "")
                .replace(/[_-]+/g, " ")
                .replace(/\s+/g, " ")
                .trim() || "Document"
        } catch {
            return rawLabel.replace(/%20/g, " ").replace(/\.[a-z0-9]+$/i, "")
        }
    }

    const getNoticeTitle = (notice: StockNewsItem) =>
        notice.title || ("newsHeadline" in notice ? notice.newsHeadline : undefined) || ("messageTitle" in notice ? notice.messageTitle : undefined) || "Market notice"

    const getNoticeBody = (notice: StockNewsItem) =>
        notice.body || ("newsBody" in notice ? notice.newsBody : undefined) || ("messageBody" in notice ? notice.messageBody : undefined) || ""

    const getNoticeDate = (notice: StockNewsItem) =>
        notice.publishedAt || ("addedDate" in notice ? notice.addedDate : undefined) || ("expiresAt" in notice ? notice.expiresAt : undefined) || ("expiryDate" in notice ? notice.expiryDate : undefined) || ""

    const getNoticeDocuments = (notice?: StockNewsItem) => {
        const nestedDocuments = notice && "documents" in notice
            ? notice.documents
            : undefined
        const legacyDocuments = notice && "applicationDocumentDetailsList" in notice
            ? notice.applicationDocumentDetailsList
            : undefined
        const directFileUrl = notice && "fileUrl" in notice ? notice.fileUrl : undefined
        const directFilePath = notice && "filePath" in notice ? notice.filePath : undefined
        const documents = [
            ...(nestedDocuments || []),
            ...(legacyDocuments || []),
            ...(directFileUrl || directFilePath ? [{ fileUrl: directFileUrl || undefined, filePath: directFilePath || undefined }] : []),
        ]
        if (!documents.length) return []
        return documents
            .map((doc) => {
                const directUrl = (doc.fileUrl || "").trim()
                if (directUrl) {
                    return {
                        label: formatDocumentLabel(directUrl),
                        url: directUrl,
                    }
                }
                const rawPath = (doc.filePath || "").trim()
                if (!rawPath) return null
                if (/^https?:\/\//i.test(rawPath)) {
                    return { label: formatDocumentLabel(rawPath), url: rawPath }
                }
                const normalized = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath
                return {
                    label: formatDocumentLabel(rawPath),
                    url: `https://www.nepalstock.com.np/api/nots/security/fetchFiles?fileLocation=${encodeURI(normalized)}`,
                }
            })
            .filter((doc): doc is { label: string; url: string } => Boolean(doc?.url))
    }

    const toggleNoticeDetails = (noticeId: number) => {
        setExpandedNoticeId((prev) => (prev === noticeId ? null : noticeId))
    }

    const handleOpenDocument = (url: string) => {
        setPdfSourceUrl(url)
        setPdfUrl(`/api/proxy/pdf?url=${encodeURIComponent(url)}`)
        setIsPdfOpen(true)
    }

    const loadBtcNews = useCallback(async () => {
        if (btcNews.length > 0 || isBtcNewsLoading) return
        setIsBtcNewsLoading(true)
        setBtcNewsError(null)
        try {
            const response = await fetch("/api/crypto/btc-news")
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || "Failed to fetch Bitcoin news")
            }
            const items = Array.isArray(data?.items) ? data.items : []
            setBtcNews(items as BtcNewsItem[])
        } catch (error: any) {
            setBtcNewsError(error?.message || "Could not load Bitcoin news right now.")
        } finally {
            setIsBtcNewsLoading(false)
        }
    }, [btcNews.length, isBtcNewsLoading])

    useEffect(() => {
        if (!open || !isBitcoin) return
        loadBtcNews()
    }, [open, isBitcoin, loadBtcNews])

    const loadPriceHistory = useCallback(async (range: PriceHistoryRange = priceHistoryRange, force = false) => {
        if (!item || isCrypto || isPriceHistoryLoading) return
        const cachedPoints = priceHistoryCache[range]
        if (!force && cachedPoints) {
            setPriceHistory(cachedPoints)
            setPriceHistoryError(null)
            return
        }

        setIsPriceHistoryLoading(true)
        setPriceHistoryError(null)
        try {
            const symbol = normalizeStockSymbol(item.symbol)
            const rangeConfig = getPriceHistoryRangeConfig(range)
            const response = await fetch(`/api/nepse/ltp/history?symbol=${encodeURIComponent(symbol)}&months=${rangeConfig.months}`)
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error?.message || data?.message || "Failed to fetch price history")
            }
            const points = Array.isArray(data?.points) ? data.points : []
            const aggregatedPoints = aggregatePriceHistory(points as LtpHistoryPoint[], rangeConfig.grouping)
            setPriceHistory(aggregatedPoints)
            setPriceHistoryCache((current) => ({
                ...current,
                [range]: aggregatedPoints,
            }))
        } catch (error: any) {
            setPriceHistoryError(error?.message || "Could not load price history right now.")
        } finally {
            setIsPriceHistoryLoading(false)
        }
    }, [isCrypto, isPriceHistoryLoading, item, priceHistoryCache, priceHistoryRange])

    useEffect(() => {
        if (!open || activeTab !== "price" || isCrypto) return
        loadPriceHistory(priceHistoryRange)
    }, [activeTab, isCrypto, loadPriceHistory, open, priceHistoryRange])

    const loadCompanyProfile = useCallback(async () => {
        if (!item || isCrypto || isCompanyProfileLoading) return
        const nextSymbol = normalizeStockSymbol(item.symbol)
        if (companyProfileLoadedSymbol === nextSymbol) return

        setIsCompanyProfileLoading(true)
        setCompanyProfileError(null)
        try {
            const response = await fetch(`/api/nepse/company/profile?symbol=${encodeURIComponent(nextSymbol)}`)
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error?.message || data?.message || "Failed to fetch company profile")
            }
            setCompanyProfile((data?.profile || null) as CompanyProfile | null)
            setCompanyProfileLoadedSymbol(nextSymbol)
        } catch (error: unknown) {
            setCompanyProfileError(error instanceof Error ? error.message : "Could not load company profile right now.")
            setCompanyProfileLoadedSymbol(nextSymbol)
        } finally {
            setIsCompanyProfileLoading(false)
        }
    }, [companyProfileLoadedSymbol, isCompanyProfileLoading, isCrypto, item])

    const loadFinancialReports = useCallback(async () => {
        if (!item || isCrypto || isFinancialReportsLoading) return
        const nextSymbol = normalizeStockSymbol(item.symbol)
        if (financialReportsLoadedSymbol === nextSymbol) return

        setIsFinancialReportsLoading(true)
        setFinancialReportsError(null)
        try {
            const response = await fetch(`/api/nepse/company/financials?symbol=${encodeURIComponent(nextSymbol)}`)
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error?.message || data?.message || "Failed to fetch financial reports")
            }
            const reports = Array.isArray(data?.company?.reports) ? data.company.reports : []
            setFinancialReports(reports as CompanyFinancialReport[])
            setFinancialMetadata((data?.metadata || null) as CompanyFinancialMetadata | null)
            setFinancialReportsLoadedSymbol(nextSymbol)
        } catch (error: unknown) {
            setFinancialReportsError(error instanceof Error ? error.message : "Could not load financial reports right now.")
            setFinancialReportsLoadedSymbol(nextSymbol)
        } finally {
            setIsFinancialReportsLoading(false)
        }
    }, [financialReportsLoadedSymbol, isCrypto, isFinancialReportsLoading, item])

    const sortedFinancialReports = useMemo(() => financialReports.slice().sort((a, b) => {
        const aSubmitted = a.documents?.[0]?.submitted_date || ""
        const bSubmitted = b.documents?.[0]?.submitted_date || ""
        return bSubmitted.localeCompare(aSubmitted)
    }), [financialReports])

    const currentNepaliFiscalYear = useMemo(() => getNepaliFiscalYearForDate(new Date()), [])
    const currentAdFiscalYear = useMemo(() => getAdFiscalYearForDate(new Date()), [])

    const currentFinancialYearReports = useMemo(() =>
        sortedFinancialReports.filter((report) =>
            report.fy_nepali === currentNepaliFiscalYear || report.fy === currentAdFiscalYear,
        ),
    [currentAdFiscalYear, currentNepaliFiscalYear, sortedFinancialReports])

    const latestFinancialReport = useMemo(() => {
        return currentFinancialYearReports[0] || sortedFinancialReports[0] || null
    }, [currentFinancialYearReports, sortedFinancialReports])

    const financialCompareReportOptions = useMemo(() => {
        if (!latestFinancialReport) return []
        return sortedFinancialReports.filter((report) => report !== latestFinancialReport)
    }, [latestFinancialReport, sortedFinancialReports])

    const financialCompareReport = useMemo(() => {
        if (!latestFinancialReport || financialCompareReportOptions.length === 0) return null
        return financialCompareReportOptions.find((report, index) => getFinancialReportKey(report, index) === financialCompareReportKey) || financialCompareReportOptions[0]
    }, [financialCompareReportKey, financialCompareReportOptions, latestFinancialReport])

    const activeFinancialCompareKey = useMemo(() => {
        if (!financialCompareReport) return ""
        const index = financialCompareReportOptions.findIndex((report) => report === financialCompareReport)
        return getFinancialReportKey(financialCompareReport, Math.max(index, 0))
    }, [financialCompareReport, financialCompareReportOptions])

    const isLatestFinancialReportCurrentFy = Boolean(
        latestFinancialReport &&
        (latestFinancialReport.fy_nepali === currentNepaliFiscalYear || latestFinancialReport.fy === currentAdFiscalYear),
    )

    const getFinancialMetricDelta = (
        currentValue: number | undefined,
        compareValue: number | undefined,
        direction: "higher" | "lower" | "neutral" = "higher",
    ) => {
        const currentNumber = Number(currentValue)
        const compareNumber = Number(compareValue)
        if (!Number.isFinite(currentNumber) || !Number.isFinite(compareNumber) || compareNumber === 0) {
            return null
        }

        const delta = currentNumber - compareNumber
        const percent = (delta / Math.abs(compareNumber)) * 100
        const isNeutral = direction === "neutral" || Math.abs(delta) < 0.0001
        const isGood = isNeutral ? null : direction === "higher" ? delta > 0 : delta < 0

        return {
            delta,
            percent,
            isGood,
            toneClass: isGood === null
                ? "border-muted/40 bg-muted/10 text-muted-foreground"
                : isGood
                    ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
        }
    }

    const renderFinancialDelta = (
        currentValue: number | undefined,
        compareValue: number | undefined,
        direction: "higher" | "lower" | "neutral" = "higher",
    ) => {
        const delta = getFinancialMetricDelta(currentValue, compareValue, direction)
        if (!delta) return null

        return (
            <span className={cn("mt-2 inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider", delta.toneClass)}>
                {delta.delta > 0 ? "+" : ""}{delta.percent.toFixed(1)}% {delta.delta > 0 ? "increase" : delta.delta < 0 ? "decrease" : "flat"}
            </span>
        )
    }

    const renderFinancialDeltaPill = (
        label: string,
        currentValue: number | undefined,
        compareValue: number | undefined,
        direction: "higher" | "lower" | "neutral" = "higher",
    ) => {
        const delta = getFinancialMetricDelta(currentValue, compareValue, direction)
        if (!delta) return null

        return (
            <span className={cn("rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider", delta.toneClass)}>
                {label} {delta.delta > 0 ? "+" : ""}{delta.percent.toFixed(1)}%
            </span>
        )
    }

    const financialReportsByYear = useMemo(() => {
        const groups = new Map<string, CompanyFinancialReport[]>()

        financialReports.forEach((report) => {
            const year = report.fy_nepali || report.fy || "Unknown FY"
            const existing = groups.get(year) || []
            existing.push(report)
            groups.set(year, existing)
        })

        return Array.from(groups.entries())
            .map(([year, reports]) => ({
                year,
                reports: reports.slice().sort((a, b) => {
                    const aSubmitted = a.documents?.[0]?.submitted_date || ""
                    const bSubmitted = b.documents?.[0]?.submitted_date || ""
                    return bSubmitted.localeCompare(aSubmitted)
                }),
                isCurrentFiscalYear: year === currentNepaliFiscalYear || year === currentAdFiscalYear,
                latestSubmittedDate: reports.reduce((latest, report) => {
                    const submittedDate = report.documents?.[0]?.submitted_date || ""
                    return submittedDate > latest ? submittedDate : latest
                }, ""),
            }))
            .sort((a, b) =>
                Number(b.isCurrentFiscalYear) - Number(a.isCurrentFiscalYear) ||
                getFiscalYearSortValue(b.year) - getFiscalYearSortValue(a.year) ||
                b.latestSubmittedDate.localeCompare(a.latestSubmittedDate)
            )
    }, [currentAdFiscalYear, currentNepaliFiscalYear, financialReports])

    const loadDividendHistory = async () => {
        if (dividendHistory || isDividendHistoryLoading) return
        setIsDividendHistoryLoading(true)
        setDividendHistoryError(null)
        try {
            const response = await fetch("/api/nepse/proposed-dividend/history-all-years")
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || "Failed to fetch dividend history")
            }
            if (!Array.isArray(data)) {
                throw new Error("Dividend history response was invalid")
            }
            setDividendHistory(data as ProposedDividendRecord[])
        } catch (error: any) {
            setDividendHistoryError(error?.message || "Could not load dividend history right now.")
        } finally {
            setIsDividendHistoryLoading(false)
        }
    }

    const symbol = normalizeStockSymbol(item?.symbol)
    const normalizedHoldingName = normalizeCompany(companyName)
    const getDividendRecordTime = (record: ProposedDividendRecord) => {
        const rawDate = (record.announcement_date || "").trim()
        if (!rawDate || rawDate.toLowerCase() === "n/a") {
            return Number.NEGATIVE_INFINITY
        }
        const parsed = Date.parse(rawDate)
        return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
    }

    const getDividendKey = (record: ProposedDividendRecord) =>
        `${record.id}-${record.fiscal_year || ""}-${record.announcement_date || ""}`

    const matchedDividendHistory = useMemo(() => {
        return (dividendHistory || [])
            .filter((record) => {
                const recordSymbol = normalizeStockSymbol(record.symbol)
                if (symbol && recordSymbol === symbol) return true
                const recordName = normalizeCompany(record.company_name)
                return Boolean(normalizedHoldingName && recordName && (recordName.includes(normalizedHoldingName) || normalizedHoldingName.includes(recordName)))
            })
            .sort((a, b) => {
                const aDate = getDividendRecordTime(a)
                const bDate = getDividendRecordTime(b)
                return bDate - aDate
            })
    }, [dividendHistory, symbol, normalizedHoldingName])

    const latestDividend = matchedDividendHistory[0]
    const selectedDividend = useMemo(() => {
        if (!selectedDividendKey) return undefined
        return matchedDividendHistory.find((record) => getDividendKey(record) === selectedDividendKey)
    }, [matchedDividendHistory, selectedDividendKey])
    const activeDividend = selectedDividend || latestDividend
    const isUsingSelectedDividend = Boolean(selectedDividend)
    const latestCashPercent = parsePositiveNumber(activeDividend?.cash_dividend)
    const latestBonusPercent = parsePositiveNumber(activeDividend?.bonus_share)
    const heldUnits = item?.units ?? 0
    const faceValue = !isCrypto
        ? (item?.sector === "Mutual Fund" ? 10 : getFaceValue(symbol))
        : 0
    const cashPerUnit = (latestCashPercent / 100) * faceValue
    const estimatedCashAmount = cashPerUnit * heldUnits
    const estimatedBonusUnits = (latestBonusPercent / 100) * heldUnits

    const dividendSearchCatalog = useMemo(() => {
        const map = new Map<string, { symbol: string; name: string }>()
        ;(dividendHistory || []).forEach((record) => {
            const recordSymbol = normalizeStockSymbol(record.symbol)
            if (!recordSymbol) return
            if (map.has(recordSymbol)) return
            map.set(recordSymbol, {
                symbol: recordSymbol,
                name: (record.company_name || scripNamesMap[recordSymbol] || recordSymbol).trim(),
            })
        })
        return Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol))
    }, [dividendHistory, scripNamesMap])

    const normalizedWhatIfQuery = whatIfQuery.trim().toLowerCase()
    const whatIfSuggestions = useMemo(() => {
        if (!normalizedWhatIfQuery) return []
        return dividendSearchCatalog
            .filter((entry) =>
                entry.symbol.toLowerCase().includes(normalizedWhatIfQuery) ||
                entry.name.toLowerCase().includes(normalizedWhatIfQuery),
            )
            .slice(0, 6)
    }, [dividendSearchCatalog, normalizedWhatIfQuery])

    const whatIfSelectedSymbol = useMemo(() => {
        const exactMatch = dividendSearchCatalog.find((entry) => entry.symbol.toLowerCase() === normalizedWhatIfQuery)
        return exactMatch?.symbol || normalizeStockSymbol(whatIfQuery)
    }, [dividendSearchCatalog, normalizedWhatIfQuery, whatIfQuery])

    const whatIfSelectedCatalogEntry = useMemo(
        () => dividendSearchCatalog.find((entry) => entry.symbol === whatIfSelectedSymbol),
        [dividendSearchCatalog, whatIfSelectedSymbol],
    )

    const whatIfMatchedDividendHistory = useMemo(() => {
        if (!whatIfSelectedSymbol) return []
        const normalizedSearchName = normalizeCompany(whatIfSelectedCatalogEntry?.name || "")
        return (dividendHistory || [])
            .filter((record) => {
                const recordSymbol = normalizeStockSymbol(record.symbol)
                if (recordSymbol === whatIfSelectedSymbol) return true
                const recordName = normalizeCompany(record.company_name)
                return Boolean(normalizedSearchName && recordName && (recordName.includes(normalizedSearchName) || normalizedSearchName.includes(recordName)))
            })
            .sort((a, b) => getDividendRecordTime(b) - getDividendRecordTime(a))
    }, [dividendHistory, whatIfSelectedCatalogEntry?.name, whatIfSelectedSymbol])

    const whatIfLatestDividend = whatIfMatchedDividendHistory[0]
    const parsedWhatIfUnits = Number.parseFloat(whatIfUnits)
    const whatIfUnitsValue = Number.isFinite(parsedWhatIfUnits) && parsedWhatIfUnits >= 0 ? parsedWhatIfUnits : 0
    const whatIfCashPercent = parsePositiveNumber(whatIfLatestDividend?.cash_dividend)
    const whatIfBonusPercent = parsePositiveNumber(whatIfLatestDividend?.bonus_share)
    const whatIfFaceValue = whatIfSelectedSymbol ? getFaceValue(whatIfSelectedSymbol) : 0
    const whatIfCashPerUnit = (whatIfCashPercent / 100) * whatIfFaceValue
    const whatIfEstimatedCash = whatIfCashPerUnit * whatIfUnitsValue
    const whatIfEstimatedBonusUnits = (whatIfBonusPercent / 100) * whatIfUnitsValue
    const whatIfReferenceHolding = useMemo(
        () => portfolio.find((entry) => normalizeStockSymbol(entry.symbol) === whatIfSelectedSymbol && (entry.assetType || "stock") === "stock" && !entry.cryptoId),
        [portfolio, whatIfSelectedSymbol],
    )
    const whatIfCurrentPrice = Number.isFinite(whatIfReferenceHolding?.currentPrice)
        ? (whatIfReferenceHolding?.currentPrice ?? 0)
        : Number.isFinite(whatIfReferenceHolding?.buyPrice)
            ? (whatIfReferenceHolding?.buyPrice ?? 0)
            : 0
    const whatIfCurrentValue = whatIfCurrentPrice * whatIfUnitsValue
    const showWhatIfSuggestions = isWhatIfSearchFocused && normalizedWhatIfQuery.length > 0

    const existingSipPlan = useMemo(() => {
        if (!item || isMarketLookupItem) return null
        return normalizeSipPlans(userProfile?.sipPlans).find((plan) =>
            plan.portfolioId === item.portfolioId &&
            normalizeStockSymbol(plan.symbol) === symbol &&
            plan.assetType === "stock"
        ) || null
    }, [isMarketLookupItem, item, symbol, userProfile?.sipPlans])

    const sipSchedule = useMemo(() => {
        if (!existingSipPlan) return null
        return getSipScheduleSummary(existingSipPlan, shareTransactions, new Date())
    }, [existingSipPlan, shareTransactions])

    const currentSipInstallment = useMemo(() => {
        if (!existingSipPlan || !sipSchedule?.nextDate) return null
        return getSipCompletedTransactionForDueDate(existingSipPlan, shareTransactions, sipSchedule.nextDate)
    }, [existingSipPlan, shareTransactions, sipSchedule?.nextDate])

    const matchedTransactions = useMemo(() => {
        if (!item || !shareTransactions || isMarketLookupItem) return []
        const portfolioId = item.portfolioId
        return shareTransactions
            .filter((tx) => tx.portfolioId === portfolioId && normalizeStockSymbol(tx.symbol) === symbol)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [isMarketLookupItem, item, shareTransactions, symbol])

    const soldTransactions = useMemo(
        () => matchedTransactions.filter((tx) => tx.type === "sell"),
        [matchedTransactions],
    )

    const soldDetailStats = useMemo(() => {
        const soldUnits = soldTransactions.reduce((sum, tx) => sum + (Number.isFinite(tx.quantity) ? tx.quantity : 0), 0)
        const soldValue = soldTransactions.reduce((sum, tx) => {
            const quantity = Number.isFinite(tx.quantity) ? tx.quantity : 0
            const price = Number.isFinite(tx.price) ? tx.price : 0
            return sum + quantity * price
        }, 0)
        const sellTimestamps = soldTransactions
            .map((tx) => new Date(tx.date).getTime())
            .filter((timestamp) => Number.isFinite(timestamp))
        const latestSellAt = sellTimestamps.length > 0 ? Math.max(...sellTimestamps) : null
        const firstSellAt = sellTimestamps.length > 0 ? Math.min(...sellTimestamps) : null
        const averageSoldPrice = soldUnits > 0 ? soldValue / soldUnits : 0
        const currentTradingValue = soldUnits * current
        const valueDifference = currentTradingValue - soldValue

        return {
            soldUnits,
            soldValue,
            latestSellAt,
            firstSellAt,
            averageSoldPrice,
            currentTradingValue,
            valueDifference,
            valueDifferencePercentage: soldValue > 0 ? (valueDifference / soldValue) * 100 : 0,
            hasRecordedSellValue: averageSoldPrice > 0,
        }
    }, [current, soldTransactions])

    const sipTransactions = useMemo(() => {
        if (!existingSipPlan) return []
        return getSipDisplayTransactionsForPlan(existingSipPlan, matchedTransactions)
    }, [existingSipPlan, matchedTransactions])

    const getSipGrossAmount = useCallback((tx: ShareTransaction) => getSipTransactionGrossAmount(tx), [])

    const getSipNetAmount = useCallback((tx: ShareTransaction) => getSipTransactionNetAmount(tx), [])

    const isEligibleForSipEnrollment = useCallback((tx: ShareTransaction) => isSipEnrollmentCandidate(tx), [])

    const sipEnrollmentCandidates = useMemo(() =>
        matchedTransactions
            .filter((tx) => isEligibleForSipEnrollment(tx))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [isEligibleForSipEnrollment, matchedTransactions])

    const handleCompleteSipInstallment = async () => {
        if (!existingSipPlan || !sipSchedule?.nextDate || currentSipInstallment) return
        setIsCompletingSip(true)
        try {
            const executionPrice = Number.isFinite(item?.currentPrice) ? (item?.currentPrice ?? 0) : safeCurrent
            const result = await completeSipInstallment(existingSipPlan.id, {
                dueDate: sipSchedule.nextDate.toISOString(),
                price: executionPrice,
            })
            toast.success("SIP installment completed", {
                description: `${result.installment.investedAmount.toFixed(2)} invested into ${item?.symbol} after ${(result.installment.dpsCharge ?? SIP_DEFAULT_DPS_CHARGE).toFixed(2)} DPS charge.`,
            })
        } catch (error: any) {
            toast.error("Could not complete SIP installment", {
                description: error?.message || "Please try again.",
            })
        } finally {
            setIsCompletingSip(false)
        }
    }

    const handleDeleteTransaction = async (transactionId: string) => {
        if (deletingTransactionId) return
        setDeletingTransactionId(transactionId)
        try {
            await deleteShareTransaction(transactionId)
            toast.success("Transaction deleted", {
                description: "Linked SIP installment history was updated too.",
            })
        } catch (error: any) {
            toast.error("Could not delete transaction", {
                description: error?.message || "Please try again.",
            })
        } finally {
            setDeletingTransactionId(null)
        }
    }

    const handleUpdateTransaction = async (id: string, updates: Partial<Omit<ShareTransaction, "id">>) => {
        try {
            await updateShareTransaction(id, updates)
            toast.success("Transaction updated")
        } catch (error: any) {
            toast.error("Could not update transaction", {
                description: error?.message || "Please try again.",
            })
            throw error
        }
    }

    const handleEditClick = (tx: ShareTransaction) => {
        setEditingTransaction(tx)
        setIsEditModalOpen(true)
    }

    const openInlineTransaction = (type: "buy" | "sell") => {
        const executionPrice = Number.isFinite(item?.currentPrice) ? item?.currentPrice ?? 0 : safeBuyPrice
        setInlineTransaction({
            symbol: item?.symbol || "",
            assetType: item?.assetType || "stock",
            cryptoId: item?.cryptoId || "",
            quantity: Number.NaN,
            price: executionPrice > 0 ? executionPrice : Number.NaN,
            type,
            date: new Date().toISOString().split("T")[0],
            description: "",
        })
        setTransactionMode(type)
    }

    const handleInlineTransactionSubmit = async () => {
        if (!item || !transactionMode || isInlineTransactionSaving) return
        const symbol = inlineTransaction.symbol.trim()
        const quantity = Number(inlineTransaction.quantity)
        const price = Number(inlineTransaction.price)
        const requiresPrice = inlineTransaction.type !== "bonus" && inlineTransaction.type !== "gift"
        if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || (requiresPrice && (!Number.isFinite(price) || price <= 0))) {
            toast.error("Please fill all fields correctly")
            return
        }

        setIsInlineTransactionSaving(true)
        try {
            let resolvedSymbol = symbol.toUpperCase()
            if (inlineTransaction.assetType === "stock") {
                const rawLower = symbol.toLowerCase()
                const lookupOptions = [...inlineStockOptions, ...inlinePortfolioStockOptions]
                const exactSymbol = lookupOptions.find((stock) => stock.symbol.toLowerCase() === rawLower)
                const exactName = lookupOptions.find((stock) => stock.name.toLowerCase() === rawLower)
                if (exactSymbol) resolvedSymbol = exactSymbol.symbol
                else if (exactName) resolvedSymbol = exactName.symbol
            }

            let cryptoId: string | undefined = undefined
            if (inlineTransaction.assetType === "crypto") {
                if (inlineTransaction.cryptoId?.trim()) {
                    cryptoId = inlineTransaction.cryptoId.trim()
                } else {
                    const resolveRes = await fetch(`/api/crypto/coinlore/resolve?symbol=${encodeURIComponent(resolvedSymbol)}`)
                    const resolveData = await resolveRes.json()
                    if (!resolveRes.ok) {
                        throw new Error(resolveData?.error || `Unable to resolve Coinlore symbol: ${resolvedSymbol}`)
                    }
                    cryptoId = resolveData.id
                }
            }

            if (inlineTransaction.type === "sell") {
                const sellHolding = portfolio.find((entry) => (
                    entry.portfolioId === item.portfolioId &&
                    (inlineTransaction.assetType === "crypto" || cryptoId
                        ? ((entry.assetType === "crypto" || Boolean(entry.cryptoId)) &&
                            ((cryptoId && entry.cryptoId === cryptoId) || normalizeStockSymbol(entry.symbol) === resolvedSymbol))
                        : ((entry.assetType || "stock") === "stock" && normalizeStockSymbol(entry.symbol) === resolvedSymbol))
                ))
                if (!sellHolding || quantity > (sellHolding.units ?? 0)) {
                    toast.error("Sell quantity exceeds available units", {
                        description: sellHolding
                            ? `Available: ${sellHolding.units.toLocaleString(undefined, { maximumFractionDigits: 4 })} units.`
                            : "Select a holding you already own.",
                    })
                    return
                }
            }

            await addShareTransaction({
                portfolioId: item.portfolioId,
                assetType: inlineTransaction.assetType,
                cryptoId,
                symbol: resolvedSymbol,
                quantity,
                price: requiresPrice ? price : 0,
                type: inlineTransaction.type,
                date: inlineTransaction.date,
                description: inlineTransaction.description || `${inlineTransaction.type.toUpperCase()} ${quantity} units of ${resolvedSymbol}`,
            })
            toast.success("Transaction recorded")
            setTransactionMode(null)
            setInlineTransaction({
                symbol: "",
                assetType: "stock",
                cryptoId: "",
                quantity: Number.NaN,
                price: Number.NaN,
                type: "buy",
                date: new Date().toISOString().split("T")[0],
                description: "",
            })
        } catch (error: any) {
            toast.error("Could not record transaction", {
                description: error?.message || "Please try again.",
            })
        } finally {
            setIsInlineTransactionSaving(false)
        }
    }

    const totalSipGross = useMemo(() =>
        sipTransactions.reduce((sum, tx) => sum + getSipGrossAmount(tx), 0),
    [getSipGrossAmount, sipTransactions])

    const totalSipNet = useMemo(() =>
        sipTransactions.reduce((sum, tx) => sum + getSipNetAmount(tx), 0),
    [getSipNetAmount, sipTransactions])

    const totalSipUnits = useMemo(() =>
        sipTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0),
    [sipTransactions])
    const nextSipBaseAmount = useMemo(() => getSipBaseAmount(existingSipPlan), [existingSipPlan])
    const nextSipRemainder = useMemo(() => getSipCarryRemainder(existingSipPlan), [existingSipPlan])
    const nextSipAmounts = useMemo(() => getSipCycleAmounts(existingSipPlan), [existingSipPlan])
    const nextSipBaseOnlyAmounts = useMemo(
        () => getSipCycleAmounts(existingSipPlan, { includeCarryRemainder: false }),
        [existingSipPlan],
    )
    const nextSipGrossAmount = nextSipAmounts.grossAmount
    const nextSipNetAmount = nextSipAmounts.netAmount
    const canAffordNextSipUnit = useMemo(() => canSipCycleBuyUnit(existingSipPlan, safeCurrent), [existingSipPlan, safeCurrent])
    const canCompleteSipNow = Boolean(
        existingSipPlan &&
        sipSchedule?.nextDate &&
        (sipSchedule.isDueToday || sipSchedule.isOverdue) &&
        !currentSipInstallment &&
        canAffordNextSipUnit
    )

    const holdingStartDate = useMemo(() => {
        if (matchedTransactions.length === 0) return null
        let earliest = Number.POSITIVE_INFINITY
        for (const tx of matchedTransactions) {
            const parsed = Date.parse(tx.date)
            if (Number.isFinite(parsed) && parsed < earliest) {
                earliest = parsed
            }
        }
        return Number.isFinite(earliest) ? new Date(earliest) : null
    }, [matchedTransactions])

    const holdingPeriodLabel = useMemo(() => {
        if (!holdingStartDate) return "N/A"
        const start = holdingStartDate.getTime()
        const now = Date.now()
        if (!Number.isFinite(start) || start > now) return "N/A"
        const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
        if (diffDays < 1) return "Less than a day"
        if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"}`
        const diffMonths = Math.floor(diffDays / 30)
        if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"}`
        const years = Math.floor(diffMonths / 12)
        const months = diffMonths % 12
        return months > 0 ? `${years}y ${months}m` : `${years} year${years === 1 ? "" : "s"}`
    }, [holdingStartDate])

    const matchedNotices = useMemo(() => {
        if (!item) return []
        const normalizedSymbol = normalizeStockSymbol(symbol)
        const normalizedCompanyName = companyName.toUpperCase()
        const combined: StockNewsItem[] = [
            ...(noticesBundle?.company || []).map((notice) => ({ ...notice, sourceType: "company" as const })),
            ...(disclosures || []).map((notice) => ({ ...notice, sourceType: "disclosure" as const })),
            ...(exchangeMessages || []).map((notice) => ({ ...notice, sourceType: "exchange" as const })),
        ]
        return combined.filter((notice) => {
            const noticeSymbol = normalizeStockSymbol(notice.symbol || "")
            if (noticeSymbol && noticeSymbol === normalizedSymbol) return true

            const searchable = [
                getNoticeTitle(notice),
                getNoticeBody(notice),
                "source" in notice ? notice.source : "",
            ].join(" ").toUpperCase()
            return searchable.includes(normalizedSymbol) || (normalizedCompanyName && searchable.includes(normalizedCompanyName))
        }).sort((a, b) => new Date(getNoticeDate(b)).getTime() - new Date(getNoticeDate(a)).getTime())
    }, [item, noticesBundle, disclosures, exchangeMessages, symbol, companyName])

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                {item && (
                    <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh] sm:h-[86vh] sm:max-h-[86vh] lg:h-[88vh] lg:max-h-[88vh]" showCloseButton={false}>
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted hover:text-muted-foreground text-muted-foreground transition-all z-50 border border-muted-foreground/10"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        {transactionMode ? (
                            <div className="pr-10">
                                <Badge variant="outline" className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    transactionMode === "buy"
                                        ? "border-primary/20 text-primary bg-primary/5"
                                        : "border-destructive/20 text-destructive bg-destructive/5",
                                )}>
                                    {transactionMode === "buy" ? "Record Buy" : "Record Sell"}
                                </Badge>
                            </div>
                        ) : (
                            <>
                        <div className="flex items-center justify-between mb-2 pr-8">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                                {isSoldDetailMode ? "Sold Transaction Details" : isMarketLookupItem ? "Market Lookup" : isCrypto ? "Crypto Details" : "Stock Details"}
                            </Badge>
                            {item.lastUpdated && (
                                <div className="flex items-center gap-1.5 grayscale opacity-60">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">
                                        Synced {new Date(item.lastUpdated).toLocaleTimeString()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <DialogTitle className="text-3xl font-black tracking-tight flex items-center flex-wrap gap-2">
                                    {item.symbol}
                                    {isSoldDetailMode ? (
                                        <Badge className="bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest border-amber-500/30">
                                            SOLD LOTS
                                        </Badge>
                                    ) : isMarketLookupItem ? (
                                        <Badge className="bg-sky-500/10 text-sky-600 text-[10px] font-black uppercase tracking-widest border-sky-500/30">
                                            LIVE MARKET
                                        </Badge>
                                    ) : isZeroHolding ? (
                                        <Badge className="bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest border-amber-500/30">
                                            SOLD
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest border-none">
                                            {item.sector ?? "Others"}
                                        </Badge>
                                    )}
                                </DialogTitle>
                                {companyName && (
                                    <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mt-0.5 line-clamp-1 text-left">
                                        {companyName}
                                    </p>
                                )}
                                <DialogDescription className="text-sm font-medium mt-1 text-left">
                                    {isSoldDetailMode ? (
                                        <span className="text-amber-600/80">
                                            {formatUnits(soldDetailStats.soldUnits)} sold units across {soldTransactions.length} transaction{soldTransactions.length === 1 ? "" : "s"}
                                            {soldDetailStats.latestSellAt ? ` · last sold ${formatTimeSince(soldDetailStats.latestSellAt)}` : ""}
                                        </span>
                                    ) : isMarketLookupItem ? (
                                        <span className="text-sky-700/80">
                                            Live market details
                                        </span>
                                    ) : isZeroHolding ? (
                                        isSold && lastExitInfo ? (
                                            <span className="text-amber-600/80">
                                                Sold {lastExitInfo.quantity} units @ {currencySymbol}{lastExitInfo.price} on {formatAppDate(lastExitInfo.date, calendarSystem)}
                                            </span>
                                        ) : isMerged && lastExitInfo ? (
                                            <span className="text-purple-600/80">
                                                Merged Out {lastExitInfo.quantity} units on {formatAppDate(lastExitInfo.date, calendarSystem)}
                                            </span>
                                        ) : "Zero Units"
                                    ) : (
                                        `${formatUnits(item.units)} Units Held in Portfolio`
                                    )}
                                </DialogDescription>
                                {!isCrypto && existingSipPlan && (
                                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                                        <PiggyBank className="h-3.5 w-3.5" />
                                        {existingSipPlan.status === "paused" ? "SIP Paused" : "SIP Active"}
                                        <span className="text-primary/70">
                                            {sipSchedule?.nextDate ? `Next ${formatSipDate(sipSchedule.nextDate.toISOString(), calendarSystem)}` : "Schedule ready"}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="text-right ml-4">
                                <div className="text-2xl font-black font-mono">
                                    {currencySymbol} {formatValue(current)}
                                </div>
                                <div className={cn(
                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                                    isDailyNeutral
                                        ? "text-muted-foreground bg-muted"
                                        : isDailyProfit
                                            ? "text-green-600 bg-green-500/10"
                                            : "text-red-600 bg-red-500/10"
                                )}>
                                    {!isDailyNeutral && (isDailyProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                                    {isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                            </>
                        )}
                    </DialogHeader>

                    {transactionMode ? (
                        <div className="flex flex-1 min-h-0 flex-col bg-muted/5 overflow-hidden">
                            <ScrollArea className="h-[280px] min-h-0 sm:h-auto sm:flex-1">
                                <div className="p-6 pt-5">
                                    <AddTransactionModal
                                        embedded
                                        hideFooter
                                        open={Boolean(transactionMode)}
                                        onOpenChange={(nextOpen) => {
                                            if (!nextOpen) setTransactionMode(null)
                                        }}
                                        newTx={inlineTransaction}
                                        setNewTx={setInlineTransaction}
                                        onAdd={handleInlineTransactionSubmit}
                                        onCancel={() => setTransactionMode(null)}
                                        isSubmitting={isInlineTransactionSaving}
                                        stockOptions={inlineStockOptions}
                                        portfolioStockOptions={inlinePortfolioStockOptions}
                                        portfolioCryptoOptions={inlinePortfolioCryptoOptions}
                                        portfolioItems={portfolio}
                                        activePortfolioId={item.portfolioId}
                                        currencySymbol={currencySymbol}
                                        calendarSystem={calendarSystem}
                                    />
                                </div>
                            </ScrollArea>
                            <div className="mt-auto flex shrink-0 gap-2 border-t border-muted/20 bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                                <Button
                                    variant="ghost"
                                    className="h-11 flex-1 rounded-xl font-bold"
                                    disabled={isInlineTransactionSaving}
                                    onClick={() => setTransactionMode(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="h-11 flex-1 rounded-xl font-bold shadow-md"
                                    disabled={isInlineTransactionSaving || inlineSellQuantityError}
                                    onClick={handleInlineTransactionSubmit}
                                >
                                    {isInlineTransactionSaving ? "Recording..." : "Record"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col gap-0 overflow-hidden">
                        <div className="px-6 py-1 border-b border-muted/20 bg-muted/5">
                            <TabsList className="h-9 w-full justify-start gap-2 overflow-x-auto rounded-none border-0 bg-transparent p-0 shadow-none">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest">
                                    Overview
                                </TabsTrigger>
                                {isSoldDetailMode && (
                                    <TabsTrigger value="sold" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest">
                                        Sold Lots
                                    </TabsTrigger>
                                )}
                                {!isMarketLookupItem && (
                                    <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest">
                                        {isSoldDetailMode ? "All Tx" : "History"}
                                    </TabsTrigger>
                                )}
                                {!isCrypto && (
                                    <TabsTrigger
                                        value="financials"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest"
                                        onClick={() => {
                                            loadFinancialReports()
                                        }}
                                    >
                                        Financials
                                    </TabsTrigger>
                                )}
                                {!isCrypto && (
                                    <TabsTrigger
                                        value="dividend"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest"
                                        onClick={() => {
                                            loadDividendHistory()
                                        }}
                                    >
                                        Dividends
                                    </TabsTrigger>
                                )}
                                {!isCrypto && existingSipPlan && (
                                    <TabsTrigger
                                        value="sip"
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        SIP
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="notices" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest">
                                    News
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 min-h-0 bg-muted/5 overflow-hidden">
                            <ScrollArea className="h-[280px] sm:h-full">
                                <div className="p-6 pt-2 space-y-4">
                                    {isSoldDetailMode && (
                                        <TabsContent value="sold" className="m-0 space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 rounded-2xl border bg-muted/20 border-muted/50">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Recorded Sold Value</p>
                                                    <p className="mt-1 text-xl font-black font-mono">
                                                        {soldDetailStats.hasRecordedSellValue ? `${currencySymbol} ${formatValue(soldDetailStats.soldValue)}` : "Not recorded"}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider">
                                                            {formatUnits(soldDetailStats.soldUnits)} units
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider">
                                                            {soldTransactions.length} tx
                                                        </Badge>
                                                        {soldDetailStats.latestSellAt && (
                                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider">
                                                                Last {formatTimeSince(soldDetailStats.latestSellAt)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                                                        {soldDetailStats.hasRecordedSellValue ? `Avg ${currencySymbol} ${formatValue(soldDetailStats.averageSoldPrice)}` : "Sell price is 0 in imported data"}
                                                    </p>
                                                </div>
                                                <div className={cn(
                                                    "p-4 rounded-2xl border",
                                                    soldDetailStats.hasRecordedSellValue
                                                        ? soldDetailStats.valueDifference > 0
                                                            ? "bg-red-500/5 border-red-500/10"
                                                            : soldDetailStats.valueDifference < 0
                                                                ? "bg-green-500/5 border-green-500/10"
                                                                : "bg-muted/20 border-muted/50"
                                                        : "bg-primary/5 border-primary/10"
                                                )}>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        {soldDetailStats.hasRecordedSellValue ? "Today vs Sold" : "Current Price"}
                                                    </p>
                                                    <p className={cn(
                                                        "mt-1 text-xl font-black font-mono",
                                                        soldDetailStats.hasRecordedSellValue
                                                            ? soldDetailStats.valueDifference > 0
                                                                ? "text-red-600"
                                                                : soldDetailStats.valueDifference < 0
                                                                    ? "text-green-600"
                                                                    : "text-muted-foreground"
                                                            : "text-primary"
                                                    )}>
                                                        {soldDetailStats.hasRecordedSellValue
                                                            ? `${soldDetailStats.valueDifference >= 0 ? "+" : ""}${currencySymbol} ${formatValue(soldDetailStats.valueDifference)}`
                                                            : `${currencySymbol} ${formatValue(current)}`}
                                                    </p>
                                                    <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                                                        Trading value {currencySymbol} {formatValue(soldDetailStats.currentTradingValue)}
                                                    </p>
                                                    <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                                                        {soldDetailStats.hasRecordedSellValue
                                                            ? `${soldDetailStats.valueDifferencePercentage >= 0 ? "+" : ""}${soldDetailStats.valueDifferencePercentage.toFixed(2)}%`
                                                            : `${formatUnits(soldDetailStats.soldUnits)} units at current price`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sell transaction lots</p>
                                                {soldTransactions.length > 0 ? (
                                                    soldTransactions.map((tx) => {
                                                        const txSoldValue = tx.quantity * tx.price
                                                        const txTradingValue = tx.quantity * current
                                                        const txDifference = txTradingValue - txSoldValue
                                                        const hasTxPrice = tx.price > 0
                                                        return (
                                                            <div key={tx.id} className="p-3 rounded-xl border border-muted/30 bg-muted/5">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-600">
                                                                                <ArrowUpRight className="w-4 h-4" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] font-black uppercase">{formatUnits(tx.quantity)} units sold</p>
                                                                                <p className="text-[9px] font-bold text-muted-foreground">
                                                                                    {formatAppDate(tx.date, calendarSystem)} · {formatTimeSince(tx.date)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        {tx.description && (
                                                                            <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2">{tx.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <p className="text-[11px] font-black font-mono">
                                                                            {hasTxPrice ? `${currencySymbol}${formatValue(txSoldValue)}` : "Price N/A"}
                                                                        </p>
                                                                        <p className="text-[9px] font-bold text-muted-foreground">
                                                                            @ {currencySymbol}{formatValue(tx.price)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-muted/20 pt-2">
                                                                    <div>
                                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Today value</p>
                                                                        <p className="text-[11px] font-black font-mono">{currencySymbol}{formatValue(txTradingValue)}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{hasTxPrice ? "Difference" : "Recorded price"}</p>
                                                                        <p className={cn(
                                                                            "text-[11px] font-black font-mono",
                                                                            hasTxPrice
                                                                                ? txDifference > 0
                                                                                    ? "text-red-600"
                                                                                    : txDifference < 0
                                                                                        ? "text-green-600"
                                                                                        : "text-muted-foreground"
                                                                                : "text-muted-foreground"
                                                                        )}>
                                                                            {hasTxPrice
                                                                                ? `${txDifference >= 0 ? "+" : ""}${currencySymbol}${formatValue(txDifference)}`
                                                                                : "Not captured"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <p className="text-xs text-center text-muted-foreground py-8">No sell transactions found for this stock.</p>
                                                )}
                                            </div>
                                        </TabsContent>
                                    )}

                                    <TabsContent value="overview" className="m-0 space-y-6">
                                        {/* Performance Card */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {isMarketLookupItem ? (
                                                <>
                                                    <div className="p-4 rounded-2xl border flex flex-col gap-2 bg-sky-500/5 border-sky-500/10">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                            Live Price
                                                        </div>
                                                        <div className="text-xl font-black font-mono text-sky-700">
                                                            {currencySymbol} {formatValue(current)}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-muted-foreground">
                                                            Real-time market snapshot for {item.symbol}
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "p-4 rounded-2xl border flex flex-col gap-2",
                                                        isDailyNeutral
                                                            ? "bg-muted/20 border-muted/50"
                                                            : isDailyProfit
                                                                ? "bg-green-500/5 border-green-500/10"
                                                                : "bg-red-500/5 border-red-500/10"
                                                    )}>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                            Daily Move
                                                        </div>
                                                        <div className="text-xl font-black font-mono">
                                                            {isDailyProfit ? "+" : ""}{formatValue(dailyChange)}
                                                        </div>
                                                        <div className={cn(
                                                            "text-[10px] font-bold",
                                                            isDailyNeutral
                                                                ? "text-muted-foreground"
                                                                : isDailyProfit
                                                                    ? "text-green-600"
                                                                    : "text-red-600"
                                                        )}>
                                                            {isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(2)}% vs previous close
                                                        </div>
                                                    </div>
                                                </>
                                            ) : isZeroHolding ? (
                                                isSold ? (
                                                    <>
                                                        <div className="p-4 rounded-2xl border flex flex-col gap-2 bg-amber-500/5 border-amber-500/10">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                Last Sold Price
                                                            </div>
                                                            <div className="flex items-end justify-between">
                                                                <div className="text-xl font-black font-mono text-amber-600">
                                                                    {currencySymbol} {formatValue(lastExitInfo?.price ?? safeBuyPrice)}
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                                    per unit
                                                                </p>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-muted-foreground">
                                                                {lastExitInfo ? `${lastExitInfo.quantity} units on ${formatAppDate(lastExitInfo.date, calendarSystem)}` : "Sold"}
                                                            </div>
                                                            {/* Total Amount */}
                                                            <div className="border-t border-amber-500/20 pt-2 mt-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                                                                        Total Amount
                                                                    </span>
                                                                    <span className="text-lg font-black text-amber-600">
                                                                        {currencySymbol} {lastExitInfo ? formatValue(lastExitInfo.price * lastExitInfo.quantity) : formatValue(0)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "p-4 rounded-2xl border flex flex-col gap-2",
                                                            current > (lastExitInfo?.price ?? 0)
                                                                ? "bg-green-500/5 border-green-500/10"
                                                                : current < (lastExitInfo?.price ?? 0)
                                                                    ? "bg-red-500/5 border-red-500/10"
                                                                    : "bg-muted/20 border-muted/50"
                                                        )}>
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                Current vs Sold
                                                            </div>
                                                            <div className="flex items-end justify-between">
                                                                <div className="text-xl font-black font-mono">
                                                                    {currencySymbol} {formatValue(current)}
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                                    per unit
                                                                </p>
                                                            </div>
                                                            <div className={cn(
                                                                "text-[10px] font-bold",
                                                                current > (lastExitInfo?.price ?? 0)
                                                                    ? "text-green-600"
                                                                    : current < (lastExitInfo?.price ?? 0)
                                                                        ? "text-red-600"
                                                                        : "text-muted-foreground"
                                                            )}>
                                                                {current > (lastExitInfo?.price ?? 0)
                                                                    ? `+${((current - (lastExitInfo?.price ?? 0)) / (lastExitInfo?.price ?? 1) * 100).toFixed(2)}% since sold`
                                                                    : current < (lastExitInfo?.price ?? 0)
                                                                        ? `${((current - (lastExitInfo?.price ?? 0)) / (lastExitInfo?.price ?? 1) * 100).toFixed(2)}% since sold`
                                                                        : "Same as sold price"}
                                                            </div>
                                                            {/* Total Current Value & Change */}
                                                            <div className="border-t border-muted/30 pt-2 mt-1 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                        Total Change
                                                                    </span>
                                                                    <span className={cn(
                                                                        "text-sm font-bold",
                                                                        (current - (lastExitInfo?.price ?? 0)) * (lastExitInfo?.quantity ?? 0) > 0
                                                                            ? "text-green-600"
                                                                            : (current - (lastExitInfo?.price ?? 0)) * (lastExitInfo?.quantity ?? 0) < 0
                                                                                ? "text-red-600"
                                                                                : "text-muted-foreground"
                                                                    )}>
                                                                        {(current - (lastExitInfo?.price ?? 0)) * (lastExitInfo?.quantity ?? 0) > 0 ? "+" : ""}
                                                                        {currencySymbol} {lastExitInfo ? formatValue((current - lastExitInfo.price) * lastExitInfo.quantity) : formatValue(0)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : isMerged ? (
                                                    <>
                                                        <div className="p-4 rounded-2xl border flex flex-col gap-2 bg-purple-500/5 border-purple-500/10 col-span-2">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                Merged Out
                                                            </div>
                                                            <div className="text-lg font-black font-mono text-purple-600">
                                                                {lastExitInfo ? `${lastExitInfo.quantity} units on ${formatAppDate(lastExitInfo.date, calendarSystem)}` : "Merged"}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-muted-foreground">
                                                                This holding was merged out and is no longer active
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="p-4 rounded-2xl border flex flex-col gap-2 bg-muted/20 border-muted/50 col-span-2">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                Zero Units
                                                            </div>
                                                            <div className="text-lg font-black font-mono text-muted-foreground">
                                                                No holdings
                                                            </div>
                                                        </div>
                                                    </>
                                                )
                                            ) : (
                                                <>
                                                    <div className={cn("p-4 rounded-2xl border flex flex-col gap-2", isProfit ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10")}>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                            Position Summary
                                                        </div>
                                                        <div className="text-lg font-black font-mono">
                                                            {currencySymbol} {formatValue(value)}
                                                        </div>
                                                        <div className={cn(
                                                            "text-[10px] font-bold",
                                                            isProfit ? "text-green-600" : "text-red-600"
                                                        )}>
                                                            {formatSignedCurrency(profitLoss)} ({hasCostBasis ? `${isProfit ? "+" : ""}${formatProfitLossPercent(profitLossPerc)}` : "N/A"})
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "p-4 rounded-2xl border flex flex-col gap-2",
                                                        isDailyNeutral
                                                            ? "bg-muted/20 border-muted/50"
                                                            : isDailyProfit
                                                                ? "bg-green-500/5 border-green-500/10"
                                                                : "bg-red-500/5 border-red-500/10"
                                                    )}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Today Change</span>
                                                            <span className={cn(
                                                                "text-[10px] font-bold",
                                                                isDailyNeutral
                                                                    ? "text-muted-foreground"
                                                                    : isDailyProfit
                                                                        ? "text-green-600"
                                                                        : "text-red-600"
                                                            )}>
                                                                {isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className={cn(
                                                                "text-lg font-black font-mono",
                                                                isDailyNeutral
                                                                    ? "text-muted-foreground"
                                                                    : isDailyProfit
                                                                        ? "text-green-600"
                                                                        : "text-red-600"
                                                            )}>
                                                                {formatSignedCurrency(dailyChange * (item.units ?? 0))}
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-muted-foreground">
                                                            Per Unit: {formatSignedCurrency(dailyChange)}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Market Data */}
                                        <div className="grid grid-cols-3 gap-2 -mt-2">
                                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-muted/50">
                                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                    <TrendingUp className="w-2.5 h-2.5 text-green-500" /> High
                                                </span>
                                                <span className="text-xs font-bold font-mono">
                                                    {currencySymbol} {formatValue(item.high ?? current)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-muted/50">
                                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                    <TrendingDown className="w-2.5 h-2.5 text-red-500" /> Low
                                                </span>
                                                <span className="text-xs font-bold font-mono">
                                                    {currencySymbol} {formatValue(item.low ?? current)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-muted/50">
                                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                    <BarChart3 className="w-2.5 h-2.5 text-blue-500" /> Volume
                                                </span>
                                                <span className="text-xs font-bold font-mono">
                                                    {(item.volume ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        {!isCrypto && (
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                                                <Button
                                                    variant="outline"
                                                    className="w-full rounded-xl font-bold text-[11px] uppercase tracking-widest h-10 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                                                    onClick={() => {
                                                        setActiveTab("price")
                                                        loadPriceHistory("1M")
                                                    }}
                                                >
                                                    <BarChart3 className="w-3.5 h-3.5 mr-2" />
                                                    Price Analysis
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full rounded-xl font-bold text-[11px] uppercase tracking-widest h-10 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                                                    onClick={() => window.open(`https://merolagani.com/CompanyDetail.aspx?symbol=${item.symbol}`, '_blank')}
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                                    MeroLagani
                                                </Button>
                                            </div>
                                        )}
                                        {/* Investment Details */}
                                        {!isCrypto && (
                                            <div className="space-y-3 bg-muted/10 rounded-2xl p-4 border border-muted/30">
                                                <div className="flex justify-between items-center pb-2 border-b border-muted/20">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Activity className="w-3.5 h-3.5 text-primary" /> Average Cost
                                                    </span>
                                                    <span className="text-sm font-black font-mono">{currencySymbol} {formatValue(item.buyPrice)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pb-2 border-b border-muted/20">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Info className="w-3.5 h-3.5 text-primary" /> Total Investment
                                                    </span>
                                                    <span className="text-sm font-black font-mono">{currencySymbol} {formatValue(investment)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Activity className="w-3.5 h-3.5 text-primary" /> Holding Period
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px] font-black uppercase tracking-widest"
                                                        title={holdingStartDate ? `Since ${formatAppDate(holdingStartDate, calendarSystem)}` : "No transactions"}
                                                    >
                                                        {holdingPeriodLabel}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )}

                                        {!isCrypto && !existingSipPlan && (
                                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                            <PiggyBank className="w-3.5 h-3.5" />
                                                            SIP Plan
                                                        </p>
                                                        <p className="mt-1 text-sm font-semibold">
                                                            Start a recurring investment plan for this stock.
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                                            Track installments, deduct the fixed DPS charge, and turn each completed cycle into a real buy transaction.
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            className="rounded-xl"
                                                            onClick={() => {
                                                                setInitialEnrollmentTransactionId(null)
                                                                setIsSipModalOpen(true)
                                                            }}
                                                        >
                                                            <PiggyBank className="w-4 h-4 mr-2" />
                                                            Start SIP
                                                        </Button>
                                                        {sipEnrollmentCandidates.length > 0 && (
                                                            <Button
                                                                variant="outline"
                                                                className="rounded-xl"
                                                                onClick={() => {
                                                                    setInitialEnrollmentTransactionId(sipEnrollmentCandidates[0]?.id || null)
                                                                    setIsSipModalOpen(true)
                                                                }}
                                                            >
                                                                Already Started?
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!isCrypto && (
                                            <div className="rounded-2xl border border-muted/40 bg-muted/10 p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Company Details</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">Profile, contact, and office information from the NEPSE company dataset.</p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                                        onClick={() => {
                                                            const nextOpen = !showCompanyDetails
                                                            setShowCompanyDetails(nextOpen)
                                                            if (nextOpen) loadCompanyProfile()
                                                        }}
                                                    >
                                                        {showCompanyDetails ? "Hide Details" : "More Details"}
                                                    </Button>
                                                </div>

                                                {showCompanyDetails && (
                                                    <div className="mt-4 space-y-3 border-t border-muted/30 pt-4">
                                                        {isCompanyProfileLoading ? (
                                                            <p className="text-xs text-muted-foreground">Loading company profile...</p>
                                                        ) : companyProfileError ? (
                                                            <p className="text-xs text-destructive">{companyProfileError}</p>
                                                        ) : companyProfile ? (
                                                            <>
                                                                <p className="text-sm leading-relaxed text-foreground/90">
                                                                    {companyProfile.profile?.trim() || "NEPSE has contact details for this company, but no profile description in the current dataset."}
                                                                </p>
                                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                                    {[
                                                                        ["Address", companyProfile.address],
                                                                        ["Address Type", companyProfile.address_type],
                                                                        ["Phone", companyProfile.phone],
                                                                        ["Email", companyProfile.email],
                                                                        ["Contact", companyProfile.contact_person],
                                                                        ["Fax", companyProfile.fax],
                                                                    ].filter(([, value]) => value).map(([label, value]) => (
                                                                        <div key={label} className="rounded-xl border border-muted/40 bg-background/40 p-3">
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                                                                            <p className="mt-1 break-words text-xs font-bold">{value}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">No company profile found for {symbol}.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    {!isCrypto && (
                                        <TabsContent value="financials" className="m-0 space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financial Snapshot</p>
                                                    <p className="text-xs text-muted-foreground">Latest structured numbers from NEPSE company reports.</p>
                                                </div>
                                                <UITooltipProvider delayDuration={150}>
                                                    <UITooltip>
                                                        <UITooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8 shrink-0 rounded-full border-primary/20"
                                                                aria-label="Financial field definitions"
                                                            >
                                                                <Info className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </UITooltipTrigger>
                                                        <UITooltipContent side="left" className="max-w-xs bg-card p-3 text-foreground shadow-xl border border-border">
                                                            <div className="space-y-2 text-[11px] leading-relaxed">
                                                                <p><strong>EPS</strong>: Earnings per share.</p>
                                                                <p><strong>P/E</strong>: Price to earnings ratio; lower can mean cheaper relative to earnings.</p>
                                                                <p><strong>Profit</strong>: Reported company profit for that period.</p>
                                                                <p><strong>Paid-up Capital</strong>: Share capital actually paid by shareholders.</p>
                                                                <p><strong>Net Worth / Share</strong>: Book value per share.</p>
                                                            </div>
                                                        </UITooltipContent>
                                                    </UITooltip>
                                                </UITooltipProvider>
                                            </div>
                                            {isFinancialReportsLoading ? (
                                                <p className="text-xs text-muted-foreground">Loading financial reports...</p>
                                            ) : financialReportsError ? (
                                                <p className="text-xs text-destructive">{financialReportsError}</p>
                                            ) : financialReports.length === 0 ? (
                                                <p className="text-xs text-center text-muted-foreground py-8">No structured financial reports found for {symbol}.</p>
                                            ) : (
                                                <>
                                                    {latestFinancialReport && financialCompareReport && (
                                                        <div className="rounded-2xl border border-muted/40 bg-muted/10 p-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compared To Previous Report</p>
                                                                    <p className="mt-1 text-xs font-bold">{formatFinancialReportLabel(financialCompareReport)}</p>
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                                                    onClick={() => setIsFinancialCompareOpen((current) => !current)}
                                                                >
                                                                    {isFinancialCompareOpen ? "Hide" : "Compare"}
                                                                </Button>
                                                            </div>
                                                            {isFinancialCompareOpen && (
                                                                <div className="mt-3 border-t border-muted/30 pt-3">
                                                                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compare latest with</p>
                                                                    <select
                                                                        className="h-10 w-full rounded-xl border border-primary/20 bg-background px-3 text-xs font-bold outline-none focus:border-primary"
                                                                        value={activeFinancialCompareKey}
                                                                        onChange={(event) => setFinancialCompareReportKey(event.target.value)}
                                                                        aria-label="Compare latest financial report against"
                                                                    >
                                                                        {financialCompareReportOptions.map((report, optionIndex) => {
                                                                            const reportIndex = optionIndex
                                                                            return (
                                                                                <option key={getFinancialReportKey(report, reportIndex)} value={getFinancialReportKey(report, reportIndex)}>
                                                                                    {formatFinancialReportLabel(report)}
                                                                                </option>
                                                                            )
                                                                        })}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {latestFinancialReport && (
                                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{isLatestFinancialReportCurrentFy ? "Current FY Latest" : "Latest Submitted"}</p>
                                                                <p className="mt-1 text-xs font-black">{latestFinancialReport.type || "Report"}</p>
                                                                <p className="text-[10px] text-muted-foreground">{latestFinancialReport.quarter || latestFinancialReport.fy_nepali || latestFinancialReport.fy || "Recent"}</p>
                                                                <Badge variant={isLatestFinancialReportCurrentFy ? "default" : "outline"} className="mt-2 text-[8px] font-black uppercase tracking-widest">
                                                                    {isLatestFinancialReportCurrentFy ? "Current FY" : "Past FY"}
                                                                </Badge>
                                                            </div>
                                                            <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">EPS</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{formatValue(Number(latestFinancialReport.eps || 0))}</p>
                                                                {renderFinancialDelta(latestFinancialReport.eps, financialCompareReport?.eps, "higher")}
                                                            </div>
                                                            <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">P/E</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{formatValue(Number(latestFinancialReport.pe || 0))}</p>
                                                                {renderFinancialDelta(latestFinancialReport.pe, financialCompareReport?.pe, "lower")}
                                                            </div>
                                                            <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Profit</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{currencySymbol} {formatCompactValue(latestFinancialReport.profit)}</p>
                                                                {renderFinancialDelta(latestFinancialReport.profit, financialCompareReport?.profit, "higher")}
                                                            </div>
                                                            <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Paid-up Capital</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{currencySymbol} {formatCompactValue(latestFinancialReport.paid_up_capital)}</p>
                                                                {renderFinancialDelta(latestFinancialReport.paid_up_capital, financialCompareReport?.paid_up_capital, "higher")}
                                                            </div>
                                                            <div className="rounded-xl border border-muted/40 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Net Worth / Share</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{formatValue(Number(latestFinancialReport.net_worth_per_share || 0))}</p>
                                                                {renderFinancialDelta(latestFinancialReport.net_worth_per_share, financialCompareReport?.net_worth_per_share, "higher")}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financial History</p>
                                                            <p className="text-xs text-muted-foreground">Current FY: {currentNepaliFiscalYear || currentAdFiscalYear}. Open a year to see report files.</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {financialReportsByYear.map((group, groupIndex) => (
                                                            <details
                                                                key={`${group.year}-${group.latestSubmittedDate || groupIndex}`}
                                                                className="rounded-2xl border border-muted/40 bg-muted/10 p-4 open:border-primary/20 open:bg-primary/5"
                                                            >
                                                                <summary className="cursor-pointer list-none">
                                                                    {(() => {
                                                                        const yearLatest = group.reports[0]
                                                                        return (
                                                                            <>
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div>
                                                                            <p className="text-sm font-black">{group.year}</p>
                                                                            <p className="text-[10px] font-bold text-muted-foreground">
                                                                                {group.isCurrentFiscalYear ? "Current financial year" : "Past financial year"}
                                                                            </p>
                                                                        </div>
                                                                        <Badge variant={group.isCurrentFiscalYear ? "default" : "outline"} className="text-[9px] font-black uppercase tracking-widest">
                                                                            {group.reports.length} report{group.reports.length === 1 ? "" : "s"}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                                        <div className="rounded-xl border border-muted/40 bg-background/40 p-2">
                                                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">EPS</p>
                                                                            <p className="mt-1 text-sm font-black font-mono">{formatValue(Number(yearLatest?.eps || 0))}</p>
                                                                        </div>
                                                                        <div className="rounded-xl border border-muted/40 bg-background/40 p-2">
                                                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">P/E</p>
                                                                            <p className="mt-1 text-sm font-black font-mono">{formatValue(Number(yearLatest?.pe || 0))}</p>
                                                                        </div>
                                                                        <div className="rounded-xl border border-muted/40 bg-background/40 p-2">
                                                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Profit</p>
                                                                            <p className="mt-1 text-sm font-black font-mono">{currencySymbol} {formatCompactValue(yearLatest?.profit)}</p>
                                                                        </div>
                                                                        <div className="rounded-xl border border-muted/40 bg-background/40 p-2">
                                                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Net Worth</p>
                                                                            <p className="mt-1 text-sm font-black font-mono">{formatValue(Number(yearLatest?.net_worth_per_share || 0))}</p>
                                                                        </div>
                                                                    </div>
                                                                            </>
                                                                        )
                                                                    })()}
                                                                </summary>
                                                                <div className="mt-4 space-y-3">
                                                                    {group.reports.map((report, index) => {
                                                                        const compareReport = group.reports[index + 1]
                                                                        const firstDocument = report.documents?.[0]
                                                                        const reportKey = [
                                                                            group.year,
                                                                            report.type || "report",
                                                                            report.fy || "fy",
                                                                            report.fy_nepali || "fy-nepali",
                                                                            report.quarter || "annual",
                                                                            firstDocument?.path || firstDocument?.url || firstDocument?.submitted_date || index,
                                                                            index,
                                                                        ].join("-")

                                                                        return (
                                                                            <div key={reportKey} className="rounded-xl border border-muted/40 bg-background/40 p-3">
                                                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                                    <div>
                                                                                        <p className="text-sm font-black">{report.type || "Financial Report"}</p>
                                                                                        <p className="text-[10px] font-bold text-muted-foreground">
                                                                                            {[report.quarter, report.fy].filter(Boolean).join(" / ") || "Fiscal period unavailable"}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {report.eps !== undefined && <Badge variant="outline" className="text-[9px] font-black">EPS {formatValue(Number(report.eps))}</Badge>}
                                                                                        {report.pe !== undefined && <Badge variant="outline" className="text-[9px] font-black">P/E {formatValue(Number(report.pe))}</Badge>}
                                                                                        {report.net_worth_per_share !== undefined && <Badge variant="outline" className="text-[9px] font-black">NW {formatValue(Number(report.net_worth_per_share))}</Badge>}
                                                                                    </div>
                                                                                </div>
                                                                                {compareReport && (
                                                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                                                        {renderFinancialDeltaPill("EPS", report.eps, compareReport.eps, "higher")}
                                                                                        {renderFinancialDeltaPill("P/E", report.pe, compareReport.pe, "lower")}
                                                                                        {renderFinancialDeltaPill("Profit", report.profit, compareReport.profit, "higher")}
                                                                                    </div>
                                                                                )}
                                                                                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground sm:grid-cols-3">
                                                                                    <span>Profit: <strong className="text-foreground">{currencySymbol} {formatCompactValue(report.profit)}</strong></span>
                                                                                    <span>Capital: <strong className="text-foreground">{currencySymbol} {formatCompactValue(report.paid_up_capital)}</strong></span>
                                                                                    <span>Docs: <strong className="text-foreground">{(report.documents || []).length}</strong></span>
                                                                                </div>
                                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                                    {(report.documents || []).length > 0 ? (
                                                                                        (report.documents || []).map((document, documentIndex) => (
                                                                                            <Button
                                                                                                key={`${document.path || document.url || documentIndex}`}
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                                                                                onClick={() => {
                                                                                                    if (document.url) handleOpenDocument(document.url)
                                                                                                }}
                                                                                                disabled={!document.url}
                                                                                            >
                                                                                                <ExternalLink className="w-3 h-3 mr-2" />
                                                                                                Report {documentIndex + 1}{document.submitted_date ? ` (${formatAppDate(document.submitted_date, calendarSystem)})` : ""}
                                                                                            </Button>
                                                                                        ))
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-muted-foreground">No attached documents</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </details>
                                                        ))}
                                                    </div>
                                                    {financialMetadata?.last_updated && (
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Source updated {formatAppDate(financialMetadata.last_updated, calendarSystem)}.
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </TabsContent>
                                    )}

                                    {!isCrypto && (
                                        <TabsContent value="price" className="m-0 space-y-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">LTP History</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {getPriceHistoryRangeConfig(priceHistoryRange).grouping === "daily"
                                                            ? `Daily closes · ${getPriceHistoryRangeConfig(priceHistoryRange).label}`
                                                            : getPriceHistoryRangeConfig(priceHistoryRange).grouping === "weekly"
                                                                ? "Weekly avg · daily closes"
                                                                : "Monthly avg · daily closes"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex rounded-lg border border-muted/40 bg-muted/10 p-1">
                                                        {PRICE_HISTORY_RANGES.map((rangeOption) => (
                                                            <Button
                                                                key={rangeOption.value}
                                                                type="button"
                                                                variant={priceHistoryRange === rangeOption.value ? "default" : "ghost"}
                                                                size="sm"
                                                                className="h-7 rounded-md px-2.5 text-[10px] font-black uppercase tracking-widest"
                                                                onClick={() => {
                                                                    setPriceHistoryRange(rangeOption.value)
                                                                    loadPriceHistory(rangeOption.value)
                                                                }}
                                                                disabled={isPriceHistoryLoading && priceHistoryRange === rangeOption.value}
                                                            >
                                                                {rangeOption.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg border-primary/20"
                                                        onClick={() => {
                                                            loadPriceHistory(priceHistoryRange, true)
                                                        }}
                                                        disabled={isPriceHistoryLoading}
                                                        aria-label="Refresh price history"
                                                        title="Refresh price history"
                                                    >
                                                        <RefreshCcw className={cn("h-3.5 w-3.5", isPriceHistoryLoading && "animate-spin")} />
                                                    </Button>
                                                </div>
                                            </div>

                                            {isPriceHistoryLoading ? (
                                                <div className="h-[220px] rounded-xl border border-muted/30 bg-muted/10 flex items-center justify-center">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                                        <Activity className="h-4 w-4 animate-spin" />
                                                        Loading price history...
                                                    </div>
                                                </div>
                                            ) : priceHistoryError ? (
                                                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                                                    <p className="text-xs font-bold text-destructive">{priceHistoryError}</p>
                                                </div>
                                            ) : priceHistory.length === 0 ? (
                                                <div className="h-[220px] rounded-xl border border-dashed border-muted/40 bg-muted/10 flex items-center justify-center px-6 text-center">
                                                    <p className="text-xs font-bold text-muted-foreground">No LTP history found for {item?.symbol}.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {priceHistoryStats && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Latest</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{currencySymbol} {formatValue(priceHistoryStats.latest.ltp)}</p>
                                                            </div>
                                                            <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Range Move</p>
                                                                <p className={cn("mt-1 text-sm font-black font-mono", priceHistoryStats.change >= 0 ? "text-green-600" : "text-red-600")}>
                                                                    {priceHistoryStats.change >= 0 ? "+" : ""}{priceHistoryStats.changePercent.toFixed(2)}%
                                                                </p>
                                                            </div>
                                                            <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">High</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{currencySymbol} {formatValue(priceHistoryStats.high)}</p>
                                                            </div>
                                                            <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Low</p>
                                                                <p className="mt-1 text-sm font-black font-mono">{currencySymbol} {formatValue(priceHistoryStats.low)}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="h-[clamp(220px,32vh,300px)] shrink-0 rounded-xl border border-primary/10 bg-background/60 p-2">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={priceHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                                <XAxis
                                                                    dataKey="date"
                                                                    tick={{ fontSize: 10 }}
                                                                    minTickGap={24}
                                                                    tickFormatter={(value) => {
                                                                        const parsed = new Date(`${value}T00:00:00Z`)
                                                                        return Number.isNaN(parsed.getTime())
                                                                            ? String(value)
                                                                            : getPriceHistoryRangeConfig(priceHistoryRange).grouping === "monthly"
                                                                                ? formatAppDate(parsed, calendarSystem, { month: "short", year: "2-digit", timeZone: "UTC" })
                                                                                : formatAppDate(parsed, calendarSystem, { month: "short", day: "numeric", timeZone: "UTC" })
                                                                    }}
                                                                />
                                                                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={48} />
                                                                <Tooltip
                                                                    content={({ active, payload, label }) => {
                                                                        if (!active || !payload || payload.length === 0) return null
                                                                        const row = payload[0]?.payload as LtpHistoryPoint | undefined
                                                                        return (
                                                                            <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                                                                    {formatAppDate(String(label), calendarSystem)}
                                                                                </p>
                                                                                <p className="text-xs font-bold text-primary">
                                                                                    {getPriceHistoryRangeConfig(priceHistoryRange).grouping === "daily" ? "LTP" : "Avg LTP"}: {currencySymbol} {formatValue(Number(payload[0]?.value || 0))}
                                                                                </p>
                                                                                {row?.points && row.points > 1 && (
                                                                                    <p className="text-[10px] font-bold text-muted-foreground">
                                                                                        Averaged from {row.points} daily close{row.points === 1 ? "" : "s"}
                                                                                    </p>
                                                                                )}
                                                                                {row?.volume !== undefined && (
                                                                                    <p className="text-[10px] font-bold text-muted-foreground">
                                                                                        Volume: {formatValue(row.volume)}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    }}
                                                                />
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="ltp"
                                                                    name="LTP"
                                                                    stroke="#f97316"
                                                                    strokeWidth={3}
                                                                    dot={getPriceHistoryRangeConfig(priceHistoryRange).grouping !== "daily" || priceHistory.length <= 30}
                                                                    activeDot={{ r: 4, strokeWidth: 0, fill: "#f97316" }}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>

                                                    {priceHistoryStats && (
                                                        <>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-green-700 dark:text-green-300">Best Entry</p>
                                                                        <Badge variant="outline" className="border-green-500/25 bg-green-500/10 text-[8px] font-black uppercase text-green-700 dark:text-green-300">
                                                                            Lowest LTP
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="mt-2 flex items-end justify-between gap-3">
                                                                        <p className="text-lg font-black font-mono text-green-700 dark:text-green-300">{currencySymbol} {formatValue(priceHistoryStats.bestEntry.ltp)}</p>
                                                                        <p className="text-[10px] font-bold text-muted-foreground">{formatAppDate(priceHistoryStats.bestEntry.date, calendarSystem)}</p>
                                                                    </div>
                                                                    <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                                                                        Latest is {priceHistoryStats.fromBestEntry >= 0 ? "+" : ""}{priceHistoryStats.fromBestEntry.toFixed(2)}% from this point.
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-red-700 dark:text-red-300">Best Exit</p>
                                                                        <Badge variant="outline" className="border-red-500/25 bg-red-500/10 text-[8px] font-black uppercase text-red-700 dark:text-red-300">
                                                                            Highest LTP
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="mt-2 flex items-end justify-between gap-3">
                                                                        <p className="text-lg font-black font-mono text-red-700 dark:text-red-300">{currencySymbol} {formatValue(priceHistoryStats.bestExit.ltp)}</p>
                                                                        <p className="text-[10px] font-bold text-muted-foreground">{formatAppDate(priceHistoryStats.bestExit.date, calendarSystem)}</p>
                                                                    </div>
                                                                    <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                                                                        Latest is {priceHistoryStats.fromBestExit >= 0 ? "+" : ""}{priceHistoryStats.fromBestExit.toFixed(2)}% from this point.
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Range Position</p>
                                                                        <p className="mt-1 text-xs font-bold text-muted-foreground">
                                                                            Average LTP {currencySymbol} {formatValue(priceHistoryStats.average)}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-sm font-black font-mono">{priceHistoryStats.rangePosition.toFixed(0)}%</p>
                                                                </div>
                                                                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full bg-primary"
                                                                        style={{ width: `${Math.min(Math.max(priceHistoryStats.rangePosition, 0), 100)}%` }}
                                                                    />
                                                                </div>
                                                                <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                    <span>{currencySymbol} {formatValue(priceHistoryStats.low)}</span>
                                                                    <span>{currencySymbol} {formatValue(priceHistoryStats.high)}</span>
                                                                </div>
                                                            </div>

                                                            <p className="text-[10px] font-bold text-muted-foreground">
                                                                Showing {priceHistory.length} {getPriceHistoryRangeConfig(priceHistoryRange).grouping === "daily" ? "daily" : getPriceHistoryRangeConfig(priceHistoryRange).grouping === "weekly" ? "weekly average" : "monthly average"} point{priceHistory.length === 1 ? "" : "s"} from {formatAppDate(priceHistoryStats.first.date, calendarSystem)} to {formatAppDate(priceHistoryStats.latest.date, calendarSystem)}.
                                                            </p>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </TabsContent>
                                    )}

                                    <TabsContent value="history" className="m-0 space-y-3">
                                        {matchedTransactions.length > 0 ? (
                                            matchedTransactions.map((tx) => (
                                                <div key={tx.id} className="p-3 rounded-xl border border-muted/30 bg-muted/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                                            tx.type === "buy" || tx.type === "ipo" ? "bg-green-500/10 text-green-600" :
                                                                tx.type === "reinvestment" ? "bg-cyan-500/10 text-cyan-600" :
                                                                tx.type === "sell" ? "bg-red-500/10 text-red-600" :
                                                                    "bg-blue-500/10 text-blue-600"
                                                        )}>
                                                            {tx.type === "buy" || tx.type === "ipo" ? <ArrowDownLeft className="w-4 h-4" /> :
                                                                tx.type === "reinvestment" ? <RefreshCcw className="w-4 h-4" /> :
                                                                tx.type === "sell" ? <ArrowUpRight className="w-4 h-4" /> :
                                                                    <Gift className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase">{tx.type}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground">{formatAppDate(tx.date, calendarSystem)}</p>
                                                            {tx.description && (
                                                                <p className="text-[10px] text-muted-foreground line-clamp-2">{tx.description}</p>
                                                            )}
                                                            {!existingSipPlan && isEligibleForSipEnrollment(tx) && (
                                                                <Button
                                                                    type="button"
                                                                    variant="link"
                                                                    className="h-auto px-0 py-0 text-[10px] font-bold text-primary"
                                                                    onClick={() => {
                                                                        setInitialEnrollmentTransactionId(tx.id)
                                                                        setIsSipModalOpen(true)
                                                                    }}
                                                                >
                                                                    Use this as SIP start
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black font-mono">{tx.quantity} Units</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground">@ {currencySymbol}{formatValue(tx.price)}</p>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-40 bg-popover border-border shadow-lg">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleEditClick(tx)}
                                                                    className="cursor-pointer text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary rounded-sm"
                                                                >
                                                                    <Edit3 className="w-4 h-4 mr-2 text-primary" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => void handleDeleteTransaction(tx.id)}
                                                                    disabled={deletingTransactionId === tx.id}
                                                                    className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive rounded-sm"
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-center text-muted-foreground py-8">No transaction history found.</p>
                                        )}
                                    </TabsContent>

                                    {!isCrypto && (
                                        <TabsContent value="dividend" className="m-0 space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dividend View</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 rounded-lg border-primary/20 text-[10px] font-black uppercase tracking-widest"
                                                    onClick={() => {
                                                        setIsWhatIfOpen((prev) => !prev)
                                                        if (!isWhatIfOpen) {
                                                            setWhatIfQuery(item?.symbol || "")
                                                            setWhatIfUnits(String(item?.units ?? 0))
                                                        }
                                                    }}
                                                >
                                                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                                                    {isWhatIfOpen ? "Hide What If" : "What If"}
                                                </Button>
                                            </div>

                                            {isWhatIfOpen && (
                                                <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">What If Analysis</p>
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                                                        <div className="relative">
                                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                            <Input
                                                                value={whatIfQuery}
                                                                onChange={(event) => setWhatIfQuery(event.target.value)}
                                                                onFocus={() => setIsWhatIfSearchFocused(true)}
                                                                onBlur={() => {
                                                                    window.setTimeout(() => setIsWhatIfSearchFocused(false), 120)
                                                                }}
                                                                placeholder="Search stock for dividend simulation"
                                                                className="h-10 rounded-xl border-primary/20 bg-background/90 pl-9"
                                                            />
                                                            {showWhatIfSuggestions && (
                                                                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-xl border border-primary/20 bg-card/95 p-2 shadow-xl backdrop-blur-xl">
                                                                    <div className="space-y-2">
                                                                        {whatIfSuggestions.map((entry) => (
                                                                            <button
                                                                                key={entry.symbol}
                                                                                type="button"
                                                                                className="flex w-full items-center justify-between rounded-xl border border-muted/30 bg-background/70 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
                                                                                onMouseDown={(event) => event.preventDefault()}
                                                                                onClick={() => {
                                                                                    setWhatIfQuery(entry.symbol)
                                                                                    setIsWhatIfSearchFocused(false)
                                                                                }}
                                                                            >
                                                                                <div className="min-w-0">
                                                                                    <p className="text-[11px] font-black uppercase">{entry.symbol}</p>
                                                                                    <p className="truncate text-[10px] text-muted-foreground">{entry.name}</p>
                                                                                </div>
                                                                                <Badge variant="outline" className="h-5 rounded-md text-[8px] font-black uppercase">
                                                                                    Dividend
                                                                                </Badge>
                                                                            </button>
                                                                        ))}
                                                                        {whatIfSuggestions.length === 0 && (
                                                                            <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">No dividend-matched stock found.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={whatIfUnits}
                                                            onChange={(event) => setWhatIfUnits(event.target.value)}
                                                            placeholder="Units"
                                                            className="h-10 rounded-xl border-primary/20 bg-background/90"
                                                        />
                                                    </div>

                                                    {whatIfLatestDividend ? (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Cash Estimate</p>
                                                                    <p className="mt-1 text-sm font-black text-green-700">{formatProfitLossPercent(whatIfCashPercent)}</p>
                                                                    <p className="mt-1 text-[10px] text-green-700/80">
                                                                        Est. {currencySymbol} {formatValue(whatIfEstimatedCash)}
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Bonus Estimate</p>
                                                                    <p className="mt-1 text-sm font-black text-blue-700">{formatProfitLossPercent(whatIfBonusPercent)}</p>
                                                                    <p className="mt-1 text-[10px] text-blue-700/80">
                                                                        Est. {formatUnits(whatIfEstimatedBonusUnits)} units
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Current Value</p>
                                                                    <p className="mt-1 text-sm font-black text-amber-700">
                                                                        {currencySymbol} {formatValue(whatIfCurrentValue)}
                                                                    </p>
                                                                    <p className="mt-1 text-[10px] text-amber-700/80">
                                                                        {whatIfCurrentPrice > 0
                                                                            ? `${currencySymbol} ${formatValue(whatIfCurrentPrice)} per unit`
                                                                            : "Current price not available"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="rounded-xl border border-primary/20 bg-background/70 p-3">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Using</p>
                                                                <p className="mt-1 text-sm font-black">{whatIfSelectedCatalogEntry?.symbol || whatIfSelectedSymbol}</p>
                                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                                    {whatIfSelectedCatalogEntry?.name || "Matched company"} • {formatUnits(whatIfUnitsValue)} units
                                                                </p>
                                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                                    FY {whatIfLatestDividend.fiscal_year || "N/A"} • Face value {currencySymbol} {formatValue(whatIfFaceValue)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-xl border border-dashed border-muted/40 bg-background/40 px-3 py-3 text-xs font-semibold text-muted-foreground">
                                                            Search a stock with dividend records to preview custom cash and bonus estimates.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isDividendHistoryLoading ? (
                                                <p className="text-xs text-muted-foreground">Loading company dividend history...</p>
                                            ) : dividendHistoryError ? (
                                                <p className="text-xs text-destructive">{dividendHistoryError}</p>
                                            ) : matchedDividendHistory.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No dividend history found for this holding.</p>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/5">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">
                                                                    {isUsingSelectedDividend ? "Selected Cash" : "Latest Cash"}
                                                                </p>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 rounded-full text-green-700/80 hover:text-green-700 hover:bg-green-500/10"
                                                                    onClick={() => setShowCashInfo((prev) => !prev)}
                                                                    aria-label="Show cash dividend info"
                                                                >
                                                                    <Info className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-sm font-black text-green-700 mt-1">{latestCashPercent.toFixed(2)}%</p>
                                                            <p className="text-[10px] text-green-700/80 mt-0.5">
                                                                Est. {currencySymbol} {estimatedCashAmount.toFixed(2)}
                                                            </p>
                                                            {showCashInfo && (
                                                                <p className="text-[9px] text-green-700/60 mt-0.5">
                                                                    Face value {currencySymbol} {faceValue.toFixed(0)} • {cashPerUnit.toFixed(2)} per unit
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                                                                    {isUsingSelectedDividend ? "Selected Bonus" : "Latest Bonus"}
                                                                </p>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 rounded-full text-blue-700/80 hover:text-blue-700 hover:bg-blue-500/10"
                                                                    onClick={() => setShowBonusInfo((prev) => !prev)}
                                                                    aria-label="Show bonus dividend info"
                                                                >
                                                                    <Info className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-sm font-black text-blue-700 mt-1">{latestBonusPercent.toFixed(2)}%</p>
                                                            <p className="text-[10px] text-blue-700/80 mt-0.5">
                                                                Est. {estimatedBonusUnits.toFixed(2)} units
                                                            </p>
                                                            {showBonusInfo && (
                                                                <p className="text-[9px] text-blue-700/60 mt-0.5">
                                                                    {latestBonusPercent.toFixed(2)}% • {(latestBonusPercent / 100).toFixed(4)} per unit
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl border border-muted/30 overflow-hidden">
                                                        <table className="w-full text-left">
                                                            <thead className="bg-muted/70">
                                                                <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                                    <th className="px-3 py-2">FY</th>
                                                                    <th className="px-3 py-2">Cash</th>
                                                                    <th className="px-3 py-2">Bonus</th>
                                                                    <th className="px-3 py-2">Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-muted/10">
                                                                {matchedDividendHistory.slice(0, 15).map((record) => {
                                                                    const recordKey = getDividendKey(record)
                                                                    const isSelected = recordKey === selectedDividendKey
                                                                    const cellBaseClass = "px-3 py-2 text-[11px] font-semibold transition-colors"
                                                                    const cellHoverClass = "group-hover:bg-muted/10 group-hover:text-foreground"
                                                                    const selectedCellClass = isSelected ? "bg-muted/20" : ""
                                                                    const firstCellClass = cn(
                                                                        cellBaseClass,
                                                                        cellHoverClass,
                                                                        selectedCellClass,
                                                                        isSelected && "border-l-2 border-primary"
                                                                    )
                                                                    const cellClass = cn(cellBaseClass, cellHoverClass, selectedCellClass)
                                                                    const dateCellClass = cn(
                                                                        "px-3 py-2 text-[11px] text-muted-foreground transition-colors",
                                                                        "group-hover:bg-muted/10 group-hover:text-foreground",
                                                                        selectedCellClass
                                                                    )
                                                                    return (
                                                                    <tr
                                                                        key={recordKey}
                                                                        className={cn(
                                                                            "group cursor-pointer"
                                                                        )}
                                                                        onClick={() =>
                                                                            setSelectedDividendKey((prev) => (prev === recordKey ? null : recordKey))
                                                                        }
                                                                        data-selected={isSelected ? "true" : "false"}
                                                                    >
                                                                        <td className={firstCellClass}>{record.fiscal_year || "N/A"}</td>
                                                                        <td className={cn(cellClass, "text-green-700")}>{parsePositiveNumber(record.cash_dividend).toFixed(2)}%</td>
                                                                        <td className={cn(cellClass, "text-blue-700")}>{parsePositiveNumber(record.bonus_share).toFixed(2)}%</td>
                                                                        <td className={dateCellClass}>{record.announcement_date || "N/A"}</td>
                                                                    </tr>
                                                                )})}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </TabsContent>
                                    )}

                                    {!isCrypto && existingSipPlan && (
                                        <TabsContent value="sip" className="m-0 space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next installment</p>
                                                    <p className="mt-1 text-sm font-black">
                                                        {sipSchedule?.nextDate ? formatSipDate(sipSchedule.nextDate.toISOString(), calendarSystem) : "Not scheduled"}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                                        {sipSchedule?.isDueToday
                                                            ? "Due today"
                                                            : sipSchedule?.isOverdue
                                                                ? "Pending from previous cycle"
                                                                : sipSchedule?.daysUntilNext != null
                                                                    ? `${sipSchedule.daysUntilNext} day${sipSchedule.daysUntilNext === 1 ? "" : "s"} left`
                                                                    : "Waiting for schedule"}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Installment split</p>
                                                    <p className="mt-1 text-sm font-black">
                                                        {currencySymbol} {formatValue(nextSipBaseAmount)}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                                        DPS {currencySymbol} {formatValue(existingSipPlan.dpsCharge ?? SIP_DEFAULT_DPS_CHARGE)} • Base invests {currencySymbol} {formatValue(nextSipBaseOnlyAmounts.netAmount)}
                                                    </p>
                                                    {nextSipRemainder > 0 && (
                                                        <p className="mt-1 text-[10px] text-green-600">
                                                            + Carryover {currencySymbol} {formatValue(nextSipRemainder)} • Total this cycle invests {currencySymbol} {formatValue(nextSipNetAmount)}
                                                        </p>
                                                    )}
                                                    {nextSipRemainder <= 0 && (
                                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                                            Total this cycle invests {currencySymbol} {formatValue(nextSipNetAmount)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Completed</p>
                                                    <p className="mt-1 text-sm font-black">{sipTransactions.length}</p>
                                                </div>
                                                <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gross total</p>
                                                    <p className="mt-1 text-sm font-black">{currencySymbol} {formatValue(totalSipGross)}</p>
                                                    {existingSipPlan?.lastRemainder && existingSipPlan.lastRemainder > 0 && (
                                                        <p className="mt-1 text-[10px] text-green-600">
                                                            + {currencySymbol} {formatValue(existingSipPlan.lastRemainder)} remainder
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Units from SIP</p>
                                                    <p className="mt-1 text-sm font-black">{formatUnits(totalSipUnits)}</p>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-muted/30 bg-muted/5 p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                            <Wallet className="w-3.5 h-3.5 text-primary" />
                                                            SIP Action
                                                        </p>
                                                        <p className="mt-1 text-[12.5px] font-semibold">
                                                            {currentSipInstallment
                                                                ? "This cycle is already completed."
                                                                : canCompleteSipNow
                                                                    ? "Mark this cycle done to buy shares at the current price after the DPS charge."
                                                                    : (sipSchedule?.isDueToday || sipSchedule?.isOverdue)
                                                                        ? "This cycle is due, but the net SIP amount still cannot buy one full unit at the current price."
                                                                        : "The next SIP cycle is not due yet."}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                                            Current execution price: {currencySymbol} {formatValue(safeCurrent)} • Net buy amount: {currencySymbol} {formatValue(nextSipNetAmount)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            variant="outline"
                                                            className="rounded-xl"
                                                            onClick={() => setIsSipModalOpen(true)}
                                                        >
                                                            <PiggyBank className="w-4 h-4 mr-2" />
                                                            Manage SIP
                                                        </Button>
                                                        <Button
                                                            className="rounded-xl"
                                                            onClick={handleCompleteSipInstallment}
                                                            disabled={isCompletingSip || !canCompleteSipNow}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                            {currentSipInstallment ? "Completed" : isCompletingSip ? "Processing..." : "Mark Installment Done"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-muted/30 overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-muted/20">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Installment ledger</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground">
                                                        Net invested {currencySymbol} {formatValue(totalSipNet)}
                                                    </p>
                                                </div>
                                                {sipTransactions.length > 0 ? (
                                                    <div className="divide-y divide-muted/10">
                                                        {sipTransactions.map((tx, index) => {
                                                            const installmentNumber = sipTransactions.length - index
                                                            return (
                                                            <div key={tx.id} className="px-3 py-3 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-[11px] font-black text-primary">
                                                                        {formatOrdinalInstallment(installmentNumber)}
                                                                    </div>
                                                                    <div>
                                                                    <p className="text-[11px] font-black uppercase flex items-center gap-2">
                                                                        <PiggyBank className="w-3.5 h-3.5 text-primary" />
                                                                        {formatSipDate(tx.sipDueDate || tx.date, calendarSystem)}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                                        Gross {currencySymbol} {formatValue(getSipGrossAmount(tx))} • DPS {currencySymbol} {formatValue(tx.sipDpsCharge ?? SIP_DEFAULT_DPS_CHARGE)} • Net {currencySymbol} {formatValue(getSipNetAmount(tx))}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        Completed {formatAppDate(tx.date, calendarSystem)}
                                                                    </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[11px] font-black font-mono">{formatUnits(tx.quantity || 0)} units</p>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        @ {currencySymbol}{formatValue(tx.price || 0)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )})}
                                                    </div>
                                                ) : (
                                                    <p className="px-3 py-6 text-xs text-center text-muted-foreground">No SIP installments completed yet.</p>
                                                )}
                                            </div>

                                            <div className="rounded-xl border border-muted/30 overflow-hidden">
                                                <div className="px-3 py-2 bg-muted/50 border-b border-muted/20">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SIP buy transactions</p>
                                                </div>
                                                {sipTransactions.length > 0 ? (
                                                    <div className="divide-y divide-muted/10">
                                                        {sipTransactions.map((tx) => (
                                                            <div key={tx.id} className="px-3 py-3 flex items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="text-[11px] font-black uppercase">{tx.type}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{formatAppDate(tx.date, calendarSystem)}</p>
                                                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{tx.description}</p>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-right">
                                                                        <p className="text-[11px] font-black font-mono">{formatUnits(tx.quantity)} Units</p>
                                                                        <p className="text-[10px] text-muted-foreground">@ {currencySymbol}{formatValue(tx.price)}</p>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                                                                        onClick={() => void handleDeleteTransaction(tx.id)}
                                                                        disabled={deletingTransactionId === tx.id}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="px-3 py-6 text-xs text-center text-muted-foreground">No SIP buy transactions yet.</p>
                                                )}
                                            </div>
                                        </TabsContent>
                                    )}

                                    <TabsContent value="notices" className="m-0 space-y-3">
                                        {isBitcoin ? (
                                            isBtcNewsLoading ? (
                                                <p className="text-xs text-muted-foreground">Loading Bitcoin news...</p>
                                            ) : btcNewsError ? (
                                                <p className="text-xs text-destructive">{btcNewsError}</p>
                                            ) : btcNews.length > 0 ? (
                                                btcNews.map((news) => (
                                                    <div key={news.id} className="p-3 rounded-xl border border-muted/30 bg-muted/5 space-y-2">
                                                        <div className="flex justify-between items-start gap-2">
                                                        <h4 className="text-xs sm:text-[13px] font-bold leading-tight line-clamp-2">
                                                            {news.title}
                                                        </h4>
                                                            <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                                                                {news.publishedAt ? formatAppDate(news.publishedAt, calendarSystem) : "Recent"}
                                                            </span>
                                                        </div>
                                                        {news.summary ? (
                                                            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                                                                {news.summary}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">No summary available for this article.</p>
                                                        )}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                {news.author ? `By ${news.author}` : "Bitcoin Magazine"}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-0 text-[9px] font-black uppercase tracking-wider text-primary hover:bg-transparent"
                                                                onClick={() => window.open(news.link, "_blank", "noopener,noreferrer")}
                                                            >
                                                                Read Article
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-center text-muted-foreground py-8">No Bitcoin news found.</p>
                                            )
                                        ) : matchedNotices.length > 0 ? (
                                            matchedNotices.map((notice) => (
                                                <div key={`${notice.sourceType || "notice"}-${notice.id}`} className="p-3 rounded-xl border border-muted/30 bg-muted/5 space-y-2 transition-colors hover:border-primary/20 hover:bg-primary/5">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="text-xs sm:text-[13px] font-bold leading-tight line-clamp-2">
                                                            {getNoticeTitle(notice)}
                                                        </h4>
                                                        <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                                                            {getNoticeDate(notice) ? formatAppDate(getNoticeDate(notice), calendarSystem) : "Recent"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        {notice.sourceType && (
                                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">
                                                                {notice.sourceType}
                                                            </Badge>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 rounded-full px-2 text-[9px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 hover:text-primary"
                                                            onClick={() => toggleNoticeDetails(notice.id)}
                                                        >
                                                            {expandedNoticeId === notice.id ? "Hide Details" : "View Details"}
                                                        </Button>
                                                    </div>
                                                    {expandedNoticeId === notice.id && (
                                                        <div className="rounded-lg border border-muted/30 bg-muted/10 p-3 space-y-3">
                                                            {getNoticeBody(notice) ? (
                                                                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                                                    {stripHtml(getNoticeBody(notice))}
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground">No detailed summary available for this notice.</p>
                                                            )}
                                                            {getNoticeDocuments(notice).length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Documents</p>
                                                                    <div className="flex flex-col gap-2">
                                                                        {getNoticeDocuments(notice).map((doc, index) => {
                                                                            const decodedLabel = decodeURIComponent(doc.label)
                                                                            const truncatedLabel = decodedLabel.length > 50 
                                                                                ? decodedLabel.substring(0, 50) + '...' 
                                                                                : decodedLabel
                                                                            return (
                                                                                <Button
                                                                                    key={`${doc.url}-${index}`}
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="justify-start text-xs"
                                                                                    title={decodedLabel}
                                                                                    onClick={() => handleOpenDocument(doc.url)}
                                                                                >
                                                                                    <ExternalLink className="w-3 h-3 mr-2" />
                                                                                    {truncatedLabel}
                                                                                </Button>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-center text-muted-foreground py-8">No news found for this scrip.</p>
                                        )}
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="p-6 pt-2">
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 rounded-xl font-bold text-[11px] uppercase tracking-widest h-11 shadow-lg shadow-primary/20"
                                    onClick={() => openInlineTransaction("buy")}
                                >
                                    <Wallet className="w-3.5 h-3.5 mr-2" />
                                    {isMarketLookupItem ? "Add Buy" : "Buy"}
                                </Button>
                                {!isZeroHolding && !isMarketLookupItem && (
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl font-bold text-[11px] uppercase tracking-widest h-11 border-destructive/20 text-destructive hover:bg-destructive/10"
                                        onClick={() => openInlineTransaction("sell")}
                                    >
                                        <ArrowUpRight className="w-3.5 h-3.5 mr-2" />
                                        Sell
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Tabs>
                    )}
                    </DialogContent>
                )}
            </Dialog>
            <SIPSetupModal
                item={item}
                existingPlan={existingSipPlan}
                enrollableTransactions={sipEnrollmentCandidates}
                initialEnrollmentTransactionId={initialEnrollmentTransactionId}
                onPlanSaved={(action) => {
                    setActiveTab(action === "deleted" ? "overview" : "sip")
                }}
                open={isSipModalOpen}
                onOpenChange={(next: boolean) => {
                    setIsSipModalOpen(next)
                    if (!next) {
                        setInitialEnrollmentTransactionId(null)
                    }
                }}
            />
            <EditTransactionModal
                open={isEditModalOpen}
                onOpenChange={(next: boolean) => {
                    setIsEditModalOpen(next)
                    if (!next) {
                        setEditingTransaction(null)
                    }
                }}
                transaction={editingTransaction}
                onUpdate={handleUpdateTransaction}
                portfolioStockOptions={portfolio
                    .filter((p) => p.assetType !== "crypto")
                    .map((p) => ({ symbol: p.symbol, name: scripNamesMap[p.symbol] || p.symbol }))}
                portfolioCryptoOptions={portfolio
                    .filter((p) => p.assetType === "crypto")
                    .map((p) => ({ id: p.cryptoId, symbol: p.symbol, name: scripNamesMap[p.symbol] || p.symbol }))}
                currencySymbol={currencySymbol}
            />
            <Dialog
                open={isPdfOpen}
                onOpenChange={(next) => {
                    setIsPdfOpen(next)
                    if (!next) {
                        setPdfUrl(null)
                        setPdfSourceUrl(null)
                    }
                }}
            >
                <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-card/95 border-primary/20 shadow-2xl flex flex-col [&>button]:hidden">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-muted/20">
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-sm sm:text-base font-black uppercase tracking-widest">
                                Document Preview
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                {(pdfSourceUrl || pdfUrl) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-[10px] font-black uppercase tracking-wider"
                                        onClick={() => window.open(pdfSourceUrl || pdfUrl || "", "_blank", "noopener,noreferrer")}
                                    >
                                        <ExternalLink className="w-3 h-3 mr-2" />
                                        Open in New Tab
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-black uppercase tracking-wider"
                                    aria-label="Close preview"
                                    title="Close preview"
                                    onClick={() => {
                                        setIsPdfOpen(false)
                                        setPdfUrl(null)
                                        setPdfSourceUrl(null)
                                    }}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 bg-muted/10 relative">
                        {pdfUrl ? (
                            <div className="h-full w-full flex flex-col">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-xl border border-muted/50 bg-card/90 backdrop-blur px-1 py-1 shadow-lg">
                                    <button
                                        onClick={() => setPdfZoom((z) => Math.max(0.25, z - 0.25))}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-muted/40 transition-colors"
                                        title="Zoom out"
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </button>
                                    <span className="min-w-[3rem] text-center text-xs font-medium text-foreground">
                                        {Math.round(pdfZoom * 100)}%
                                    </span>
                                    <button
                                        onClick={() => setPdfZoom((z) => Math.min(3, z + 0.25))}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-muted/40 transition-colors"
                                        title="Zoom in"
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </button>
                                </div>
                                <iframe
                                    src={pdfUrl}
                                    className="w-full h-full border-0"
                                    style={{ transform: `scale(${pdfZoom})`, transformOrigin: "top left", width: `${100 / pdfZoom}%`, height: `${100 / pdfZoom}%` }}
                                    title="PDF Document"
                                />
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                No document selected.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
