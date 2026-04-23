"use client"

import type { PortfolioItem, ShareTransaction, NepseDisclosure } from "@/types/wallet"
import { Dialog, DialogContent,DialogDescription,DialogHeader,DialogTitle,} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {Activity,BarChart3,TrendingDown,TrendingUp,Info,Clock,ExternalLink,X,ArrowUpRight,ArrowDownLeft,Gift,PiggyBank,CheckCircle2,Wallet,Trash2} from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeStockSymbol } from "@/lib/stock-symbol"
import { Button } from "@/components/ui/button"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useEffect, useState, useMemo, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Viewer, Worker } from "@react-pdf-viewer/core"
import { zoomPlugin } from "@react-pdf-viewer/zoom"
import { SIPSetupModal } from "./sip-setup-modal"
import { SIP_DEFAULT_DPS_CHARGE, calculateSipNetInvestment, formatSipDate, getSipCompletedTransactionForDueDate, getSipDisplayTransactionsForPlan, getSipScheduleSummary, normalizeSipPlans } from "@/lib/sip"
import { toast } from "sonner"

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

const PDF_WORKER_URL = "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"

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
}

export function StockDetailModal({ item: initialItem, open, onOpenChange }: StockDetailModalProps) {
    const { userProfile, portfolio, scripNamesMap, shareTransactions, noticesBundle, disclosures, getFaceValue, completeSipInstallment, deleteShareTransaction } = useWalletData()
    const [isDividendHistoryLoading, setIsDividendHistoryLoading] = useState(false)
    const [dividendHistoryError, setDividendHistoryError] = useState<string | null>(null)
    const [dividendHistory, setDividendHistory] = useState<ProposedDividendRecord[] | null>(null)
    const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null)
    const [showCashInfo, setShowCashInfo] = useState(false)
    const [showBonusInfo, setShowBonusInfo] = useState(false)
    const [selectedDividendKey, setSelectedDividendKey] = useState<string | null>(null)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [pdfSourceUrl, setPdfSourceUrl] = useState<string | null>(null)
    const [isPdfOpen, setIsPdfOpen] = useState(false)
    const [isSipModalOpen, setIsSipModalOpen] = useState(false)
    const [initialEnrollmentTransactionId, setInitialEnrollmentTransactionId] = useState<string | null>(null)
    const [isCompletingSip, setIsCompletingSip] = useState(false)
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("overview")
    const [btcNews, setBtcNews] = useState<BtcNewsItem[]>([])
    const [isBtcNewsLoading, setIsBtcNewsLoading] = useState(false)
    const [btcNewsError, setBtcNewsError] = useState<string | null>(null)
    const zoomPluginInstance = zoomPlugin()
    const { ZoomInButton, ZoomOutButton, ZoomPopover } = zoomPluginInstance

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
        const originalPaddingRight = document.body.style.paddingRight
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
        document.body.style.overflow = "hidden"
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`
        }
        return () => {
            document.body.style.overflow = originalOverflow
            document.body.style.paddingRight = originalPaddingRight
        }
    }, [open])

    useEffect(() => {
        if (!open) {
            setShowCashInfo(false)
            setShowBonusInfo(false)
            setSelectedDividendKey(null)
            setIsPdfOpen(false)
            setIsSipModalOpen(false)
            setActiveTab("overview")
            setPdfUrl(null)
            setPdfSourceUrl(null)
        }
    }, [open])

    const isCrypto = Boolean(item && (item.assetType === "crypto" || item.cryptoId))
    const isBitcoin = Boolean(
        isCrypto &&
        item &&
        (item.symbol?.trim().toUpperCase() === "BTC" ||
            (item.cryptoId || "").toLowerCase() === "bitcoin" ||
            (item.assetName || "").toLowerCase().includes("bitcoin"))
    )
    const currencySymbol = isCrypto ? "$" : "रु"
    const isZeroHolding = (item?.units ?? 0) === 0 || item?.isKeptZeroHolding
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
        if (!isZeroHolding || !item) return null
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
    }, [isZeroHolding, item, shareTransactions])
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
    const formatUnits = (units: number) => {
        if (!Number.isFinite(units)) return "0"
        if (units === 0) return "0"
        if (Math.abs(units) < 1) return units.toLocaleString(undefined, { maximumFractionDigits: 10 })
        return units.toLocaleString(undefined, { maximumFractionDigits: 4 })
    }
    const formatValue = (amount: number) => {
        if (!Number.isFinite(amount)) return "0"
        if (amount === 0) return "0"
        if (Math.abs(amount) < 1) return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 10 })
        return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    }

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

    const getNoticeDocuments = (notice?: NepseDisclosure) => {
        if (!notice?.applicationDocumentDetailsList?.length) return []
        return notice.applicationDocumentDetailsList
            .map((doc) => {
                const directUrl = (doc.fileUrl || "").trim()
                if (directUrl) {
                    return {
                        label: directUrl.split("/").pop() || "Document",
                        url: directUrl,
                    }
                }
                const rawPath = (doc.filePath || "").trim()
                if (!rawPath) return null
                if (/^https?:\/\//i.test(rawPath)) {
                    return { label: rawPath.split("/").pop() || "Document", url: rawPath }
                }
                const normalized = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath
                return {
                    label: rawPath.split("/").pop() || "Document",
                    url: `https://www.nepalstock.com.np/api/nots/security/fetchFiles?fileLocation=${encodeURI(normalized)}`,
                }
            })
            .filter((doc): doc is { label: string; url: string } => Boolean(doc?.url))
    }

    const toggleNoticeDetails = (noticeId: number) => {
        setExpandedNoticeId((prev) => (prev === noticeId ? null : noticeId))
    }

    const handleOpenDocument = (url: string) => {
        if (isPdfLink(url)) {
            setPdfSourceUrl(url)
            setPdfUrl(`/api/proxy/pdf?url=${encodeURIComponent(url)}`)
            setIsPdfOpen(true)
            return
        }
        window.open(url, "_blank", "noopener,noreferrer")
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

    const existingSipPlan = useMemo(() => {
        if (!item) return null
        return normalizeSipPlans(userProfile?.sipPlans).find((plan) =>
            plan.portfolioId === item.portfolioId &&
            normalizeStockSymbol(plan.symbol) === symbol &&
            plan.assetType === "stock"
        ) || null
    }, [item, symbol, userProfile?.sipPlans])

    const sipSchedule = useMemo(() => {
        if (!existingSipPlan) return null
        return getSipScheduleSummary(existingSipPlan, shareTransactions, new Date())
    }, [existingSipPlan, shareTransactions])

    const currentSipInstallment = useMemo(() => {
        if (!existingSipPlan || !sipSchedule?.nextDate) return null
        return getSipCompletedTransactionForDueDate(existingSipPlan, shareTransactions, sipSchedule.nextDate)
    }, [existingSipPlan, shareTransactions, sipSchedule?.nextDate])

    const matchedTransactions = useMemo(() => {
        if (!item || !shareTransactions) return []
        const portfolioId = item.portfolioId
        return shareTransactions
            .filter((tx) => tx.portfolioId === portfolioId && normalizeStockSymbol(tx.symbol) === symbol)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [item, shareTransactions, symbol])

    const sipTransactions = useMemo(() => {
        if (!existingSipPlan) return []
        return getSipDisplayTransactionsForPlan(existingSipPlan, matchedTransactions)
    }, [existingSipPlan, matchedTransactions])

    const getSipGrossAmount = useCallback((tx: ShareTransaction) => {
        if (Number.isFinite(tx.sipGrossAmount)) return tx.sipGrossAmount ?? 0
        if (tx.type === "buy") {
            return Number((((tx.price ?? 0) * (tx.quantity ?? 0)) + (tx.sipDpsCharge ?? SIP_DEFAULT_DPS_CHARGE)).toFixed(2))
        }
        return 0
    }, [])

    const getSipNetAmount = useCallback((tx: ShareTransaction) => {
        if (Number.isFinite(tx.sipNetAmount)) return tx.sipNetAmount ?? 0
        return calculateSipNetInvestment(getSipGrossAmount(tx), tx.sipDpsCharge ?? SIP_DEFAULT_DPS_CHARGE)
    }, [getSipGrossAmount])

    const isEligibleForSipEnrollment = useCallback((tx: ShareTransaction) => {
        const isBuyType = tx.type === "buy" || tx.type === "ipo" || tx.type === "merger_in"
        const hasValidQuantity = Number.isFinite(tx.quantity) && (tx.quantity ?? 0) > 0
        return isBuyType && !tx.sipPlanId && hasValidQuantity
    }, [])

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

    const totalSipGross = useMemo(() =>
        sipTransactions.reduce((sum, tx) => sum + getSipGrossAmount(tx), 0),
    [getSipGrossAmount, sipTransactions])

    const totalSipNet = useMemo(() =>
        sipTransactions.reduce((sum, tx) => sum + getSipNetAmount(tx), 0),
    [getSipNetAmount, sipTransactions])

    const totalSipUnits = useMemo(() =>
        sipTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0),
    [sipTransactions])
    const canCompleteSipNow = Boolean(
        existingSipPlan &&
        sipSchedule?.nextDate &&
        (sipSchedule.isDueToday || sipSchedule.isOverdue) &&
        !currentSipInstallment
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
        const combined = [...(noticesBundle?.company || []), ...(disclosures || [])]
        return combined.filter(d => {
            const headline = (d.newsHeadline || "").toUpperCase()
            return headline.includes(symbol) || (companyName && headline.includes(companyName.toUpperCase()))
        }).sort((a, b) => new Date(b.addedDate || "").getTime() - new Date(a.addedDate || "").getTime())
    }, [item, noticesBundle, disclosures, symbol, companyName])

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                {item && (
                    <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh] sm:max-h-[90vh]" showCloseButton={false}>
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-all z-50 border border-muted-foreground/10"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center justify-between mb-2 pr-8">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                                {isCrypto ? "Crypto Details" : "Stock Details"}
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
                                    {isZeroHolding ? (
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
                                    {isZeroHolding ? (
                                        isSold && lastExitInfo ? (
                                            <span className="text-amber-600/80">
                                                Sold {lastExitInfo.quantity} units @ {currencySymbol}{lastExitInfo.price} on {new Date(lastExitInfo.date).toLocaleDateString()}
                                            </span>
                                        ) : isMerged && lastExitInfo ? (
                                            <span className="text-purple-600/80">
                                                Merged Out {lastExitInfo.quantity} units on {new Date(lastExitInfo.date).toLocaleDateString()}
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
                                            {sipSchedule?.nextDate ? `Next ${formatSipDate(sipSchedule.nextDate.toISOString())}` : "Schedule ready"}
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
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 py-1 border-b border-muted/20 bg-muted/5">
                            <TabsList className="bg-transparent h-9 w-full justify-start gap-4 p-0">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest">
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-9 text-[10px] font-black uppercase tracking-widest">
                                    History
                                </TabsTrigger>
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
                            <ScrollArea className="h-[280px] sm:h-[370px]">
                                <div className="p-6 pt-2 space-y-4">
                                    <TabsContent value="overview" className="m-0 space-y-6">
                                        {/* Performance Card */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {isZeroHolding ? (
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
                                                                {lastExitInfo ? `${lastExitInfo.quantity} units on ${new Date(lastExitInfo.date).toLocaleDateString()}` : "Sold"}
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
                                                                {lastExitInfo ? `${lastExitInfo.quantity} units on ${new Date(lastExitInfo.date).toLocaleDateString()}` : "Merged"}
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
                                                            {isProfit ? "+" : ""}{currencySymbol} {formatValue(profitLoss)} ({hasCostBasis ? `${isProfit ? "+" : ""}${formatProfitLossPercent(profitLossPerc)}` : "N/A"})
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
                                                                {isDailyProfit ? "+" : ""}{currencySymbol} {formatValue(dailyChange * (item.units ?? 0))}
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-muted-foreground">
                                                            Per Unit: {isDailyProfit ? "+" : ""}{currencySymbol} {formatValue(dailyChange)} ({isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(2)}%)
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
                                                        title={holdingStartDate ? `Since ${holdingStartDate.toLocaleDateString()}` : "No transactions"}
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
                                    </TabsContent>

                                    <TabsContent value="history" className="m-0 space-y-3">
                                        {matchedTransactions.length > 0 ? (
                                            matchedTransactions.map((tx) => (
                                                <div key={tx.id} className="p-3 rounded-xl border border-muted/30 bg-muted/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                                            tx.type === "buy" || tx.type === "ipo" ? "bg-green-500/10 text-green-600" :
                                                                tx.type === "sell" ? "bg-red-500/10 text-red-600" :
                                                                    "bg-blue-500/10 text-blue-600"
                                                        )}>
                                                            {tx.type === "buy" || tx.type === "ipo" ? <ArrowDownLeft className="w-4 h-4" /> :
                                                                tx.type === "sell" ? <ArrowUpRight className="w-4 h-4" /> :
                                                                    <Gift className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase">{tx.type}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
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
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black font-mono">{tx.quantity} Units</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground">@ {currencySymbol}{formatValue(tx.price)}</p>
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
                                            ))
                                        ) : (
                                            <p className="text-xs text-center text-muted-foreground py-8">No transaction history found.</p>
                                        )}
                                    </TabsContent>

                                    {!isCrypto && (
                                        <TabsContent value="dividend" className="m-0 space-y-4">
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
                                                        {sipSchedule?.nextDate ? formatSipDate(sipSchedule.nextDate.toISOString()) : "Not scheduled"}
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
                                                        {currencySymbol} {formatValue(existingSipPlan.installmentAmount)}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                                        DPS {currencySymbol} {formatValue(existingSipPlan.dpsCharge ?? SIP_DEFAULT_DPS_CHARGE)} • Invests {currencySymbol} {formatValue(calculateSipNetInvestment(existingSipPlan.installmentAmount, existingSipPlan.dpsCharge ?? SIP_DEFAULT_DPS_CHARGE))}
                                                    </p>
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
                                                                    : "The next SIP cycle is not due yet."}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                                            Current execution price: {currencySymbol} {formatValue(safeCurrent)} • Net buy amount: {currencySymbol} {formatValue(calculateSipNetInvestment(existingSipPlan.installmentAmount, existingSipPlan.dpsCharge ?? SIP_DEFAULT_DPS_CHARGE))}
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
                                                                        {formatSipDate(tx.sipDueDate || tx.date)}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                                        Gross {currencySymbol} {formatValue(getSipGrossAmount(tx))} • DPS {currencySymbol} {formatValue(tx.sipDpsCharge ?? SIP_DEFAULT_DPS_CHARGE)} • Net {currencySymbol} {formatValue(getSipNetAmount(tx))}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        Completed {new Date(tx.date).toLocaleDateString()}
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
                                                                    <p className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
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
                                                                {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString() : "Recent"}
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
                                                <div key={notice.id} className="p-3 rounded-xl border border-muted/30 bg-muted/5 space-y-2">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="text-xs sm:text-[13px] font-bold leading-tight line-clamp-2">
                                                            {notice.newsHeadline}
                                                        </h4>
                                                        <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                                                            {notice.addedDate ? new Date(notice.addedDate).toLocaleDateString() : "Recent"}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-0 text-[9px] font-black uppercase tracking-wider text-primary hover:bg-transparent"
                                                        onClick={() => toggleNoticeDetails(notice.id)}
                                                    >
                                                        {expandedNoticeId === notice.id ? "Hide Details" : "View Details"}
                                                    </Button>
                                                    {expandedNoticeId === notice.id && (
                                                        <div className="rounded-lg border border-muted/30 bg-muted/10 p-3 space-y-3">
                                                            {notice.newsBody ? (
                                                                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                                                    {stripHtml(notice.newsBody)}
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground">No detailed summary available for this notice.</p>
                                                            )}
                                                            {getNoticeDocuments(notice).length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Documents</p>
                                                                    <div className="flex flex-col gap-2">
                                                                        {getNoticeDocuments(notice).map((doc, index) => (
                                                                            <Button
                                                                                key={`${doc.url}-${index}`}
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="justify-start text-xs"
                                                                                onClick={() => handleOpenDocument(doc.url)}
                                                                            >
                                                                                <ExternalLink className="w-3 h-3 mr-2" />
                                                                                {doc.label}
                                                                            </Button>
                                                                        ))}
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

                        <div className={cn(
                            "p-6 pt-2 grid gap-3 border-t border-muted/20",
                            !isCrypto ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                        )}>
                            {!isCrypto && (
                                <Button
                                    variant="outline"
                                    className="rounded-xl font-bold text-[11px] uppercase tracking-widest h-11 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                                    onClick={() => window.open(`https://merolagani.com/CompanyDetail.aspx?symbol=${item.symbol}`, '_blank')}
                                >
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                    View Analysis
                                </Button>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 rounded-xl font-bold text-[11px] uppercase tracking-widest h-11 shadow-lg shadow-primary/20"
                                    onClick={() => {
                                        const current = Number.isFinite(item?.currentPrice) ? item.currentPrice : safeBuyPrice
                                        const event = new CustomEvent('openStockTransaction', {
                                            detail: {
                                                symbol: item?.symbol,
                                                assetType: item?.assetType || 'stock',
                                                cryptoId: item?.cryptoId || '',
                                                price: current,
                                                type: 'buy',
                                                portfolioId: item?.portfolioId
                                            }
                                        })
                                        window.dispatchEvent(event)
                                    }}
                                >
                                    <Wallet className="w-3.5 h-3.5 mr-2" />
                                    Buy
                                </Button>
                                {!isZeroHolding && (
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl font-bold text-[11px] uppercase tracking-widest h-11 border-destructive/20 text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                            const current = Number.isFinite(item?.currentPrice) ? item.currentPrice : safeBuyPrice
                                            const event = new CustomEvent('openStockTransaction', {
                                                detail: {
                                                    symbol: item?.symbol,
                                                    assetType: item?.assetType || 'stock',
                                                    cryptoId: item?.cryptoId || '',
                                                    price: current,
                                                    type: 'sell',
                                                    portfolioId: item?.portfolioId
                                                }
                                            })
                                            window.dispatchEvent(event)
                                        }}
                                    >
                                        <ArrowUpRight className="w-3.5 h-3.5 mr-2" />
                                        Sell
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Tabs>
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
                onOpenChange={(next) => {
                    setIsSipModalOpen(next)
                    if (!next) {
                        setInitialEnrollmentTransactionId(null)
                    }
                }}
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
                            <>
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-xl border border-muted/50 bg-card/90 backdrop-blur px-1 py-1 shadow-lg
                                    [&_.rpv-core__minimal-button]:text-foreground [&_.rpv-core__minimal-button]:h-7 [&_.rpv-core__minimal-button]:w-7
                                    [&_.rpv-core__minimal-button:hover]:bg-muted/40 [&_.rpv-zoom__popover-target]:text-foreground">
                                    <ZoomOutButton />
                                    <ZoomPopover />
                                    <ZoomInButton />
                                </div>
                                <Worker workerUrl={PDF_WORKER_URL}>
                                    <Viewer fileUrl={pdfUrl} plugins={[zoomPluginInstance]} />
                                </Worker>
                            </>
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
