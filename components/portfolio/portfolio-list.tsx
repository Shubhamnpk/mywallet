"use client"

import { useState, useEffect, useRef, useMemo, useDeferredValue, useCallback } from "react"
import { Plus, RefreshCcw, TrendingUp, TrendingDown, Trash2, Search, History, Download, Upload, FileText, ArrowUpRight, ArrowDownLeft, Gift, Share2, PieChart as PieChartIcon, LayoutGrid, List, Info, ChevronDown, ChevronUp, Activity, BarChart3, Sparkles, ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, MoreVertical, Edit3, BellRing, Calendar } from "lucide-react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useWalletData } from "@/contexts/wallet-data-context"
import { PortfolioItem, ShareTransaction, Portfolio, NepseDisclosure } from "@/types/wallet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getSectorColor, getSectorVariantColor } from "@/lib/portfolio-colors"
import { normalizeStockSymbol } from "@/lib/stock-symbol"
import { CreatePortfolioModal } from "./modals/create-portfolio-modal"
import { EditPortfolioModal } from "./modals/edit-portfolio-modal"
import { AddTransactionModal } from "./modals/add-transaction-modal"
import { ImportVerificationModal } from "./modals/import-verification-modal"
import { StockDetailModal } from "./modals/stock-detail-modal"
import { IPODetailModal } from "./modals/ipo-detail-modal"
import { SellConfirmationModal } from "./modals/sell-confirmation-modal"
import { EditTransactionModal } from "./modals/edit-transaction-modal"
import { UpcomingIPO } from "@/types/wallet"

const isSameCalendarDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()

const hasFreshDailyQuote = (item: PortfolioItem) => {
    if (item.assetType === "crypto" || Boolean(item.cryptoId)) return true
    if (!item.lastUpdated) return false
    const updatedAt = new Date(item.lastUpdated)
    if (Number.isNaN(updatedAt.getTime())) return false
    return isSameCalendarDay(updatedAt, new Date())
}

const parseDateToTimestamp = (value?: string) => {
    if (!value) return null
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
}

const resolveNepseDocumentUrl = (value?: string | null) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed
    return `https://www.nepalstock.com.np/api/nots/security/fetchFiles?fileLocation=${encodeURI(normalized)}`
}

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

const isPdfLikeUrl = (url: string) => /\.pdf(\?|#|$)/i.test(url)

type ImportQueueItem = {
    id: string
    symbol: string
    defaultPrice: number
    type: string
    date?: string
    quantity?: number
    description?: string
    priceOptional?: boolean
}

/** Stable snapshot for sync — avoids setState loops when `portfolio` is re-created with new object references each render. */
const portfolioItemSyncSignature = (entry: PortfolioItem) =>
    [
        entry.id,
        entry.portfolioId,
        normalizeStockSymbol(entry.symbol),
        entry.assetType || "stock",
        (entry.cryptoId || "").trim(),
        entry.units,
        entry.buyPrice,
        entry.currentPrice ?? "",
        entry.previousClose ?? "",
        entry.change ?? "",
        entry.percentChange ?? "",
        entry.lastUpdated ?? "",
        entry.high ?? "",
        entry.low ?? "",
        entry.volume ?? "",
    ].join("|")

export function PortfolioList() {
    const {portfolio,shareTransactions,deletePortfolioItem,fetchPortfolioPrices,refreshMarketData,addShareTransaction,deleteShareTransaction,deleteMultipleShareTransactions,recomputePortfolio,importShareData,userProfile,portfolios,activePortfolioId,addPortfolio,switchPortfolio,deletePortfolio,updatePortfolio,clearPortfolioHistory,updateUserProfile,getFaceValue,upcomingIPOs,isIPOsLoading,topStocks,marketStatus,marketSummary,marketSummaryHistory,noticesBundle,disclosures,exchangeMessages,scripNamesMap,toggleZeroHolding,updateShareTransaction} = useWalletData()
    const isShareFeaturesEnabled = Boolean(userProfile?.meroShare?.shareFeaturesEnabled)
    const currencySymbol = userProfile?.currency ? `${userProfile.currency} ` : "Rs. "
    const [viewMode, setViewMode] = useState<"overview" | "detail">("overview")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false)
    const [isEditPortfolioOpen, setIsEditPortfolioOpen] = useState(false)
    const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isChartExpanded, setIsChartExpanded] = useState(false)
    const [importQueue, setImportQueue] = useState<ImportQueueItem[]>([])
    const [importPrices, setImportPrices] = useState<Record<string, string>>({})
    const [importTransactionPrices, setImportTransactionPrices] = useState<Record<string, string>>({})
    const [pendingImport, setPendingImport] = useState<{ type: string, data: string } | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("holdings")
    const [holdingsView, setHoldingsView] = useState<"list" | "grid">("list")
    const [chartView, setChartView] = useState<"sector" | "scrip">("sector")
    const [chartMetric, setChartMetric] = useState<"value" | "units">("value")
    const [chartMode, setChartMode] = useState<"allocation" | "movers">("allocation")
    const [selectedTxs, setSelectedTxs] = useState<string[]>([])
    const [isStockDetailOpen, setIsStockDetailOpen] = useState(false)
    const [selectedStock, setSelectedStock] = useState<PortfolioItem | null>(null)
    const [selectedStockDetailMode, setSelectedStockDetailMode] = useState<"holding" | "sold">("holding")
    const [isIPODetailOpen, setIsIPODetailOpen] = useState(false)
    const [selectedIPO, setSelectedIPO] = useState<UpcomingIPO | null>(null)
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean
        title: string
        description: string
        onConfirm: (() => void) | null
        confirmText: string
        destructive?: boolean
    }>({ open: false, title: "", description: "", onConfirm: null, confirmText: "Confirm" })
    const [showAllIPOs, setShowAllIPOs] = useState(false)
    const [ipoFilter, setIpoFilter] = useState<"all" | "open" | "upcoming" | "closed">("all")
    const [showSoldStocks, setShowSoldStocks] = useState(false)
    const [isOverviewFeedOpen, setIsOverviewFeedOpen] = useState(false)
    const [selectedOverviewNotificationId, setSelectedOverviewNotificationId] = useState<string | null>(null)
    const [selectedOverviewNotificationDocUrl, setSelectedOverviewNotificationDocUrl] = useState<string | null>(null)
    const [isMarketHistoryOpen, setIsMarketHistoryOpen] = useState(false)
    const [investmentBreakdownModal, setInvestmentBreakdownModal] = useState<{
        open: boolean
        title: string
        portfolioId?: string | null
    }>({ open: false, title: "", portfolioId: null })
    const [marketHistoryView, setMarketHistoryView] = useState<"yearly" | "daily">("yearly")
    const [yearWindow, setYearWindow] = useState<"5" | "10" | "all">("10")
    const [dayWindow, setDayWindow] = useState<"30" | "90" | "365">("90")
    const [historySeriesMode, setHistorySeriesMode] = useState<"both" | "turnover" | "transactions">("both")
    const [expandedIPOs, setExpandedIPOs] = useState<Set<string>>(new Set())
    const [sellConfirmModal, setSellConfirmModal] = useState<{
        open: boolean
        symbol: string
        assetType?: "stock" | "crypto"
        cryptoId?: string
        portfolioId: string
    }>({ open: false, symbol: "", portfolioId: "" })
    const [editingTransaction, setEditingTransaction] = useState<ShareTransaction | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [zeroHoldingsEnabled, setZeroHoldingsEnabled] = useState(() => {
        return userProfile?.settings?.zeroHoldingsEnabled !== false
    })
    const [newPortfolio, setNewPortfolio] = useState({
        name: "",
        description: "",
        color: "#3b82f6"
    })
    const [newTx, setNewTx] = useState({
        symbol: "",
        assetType: "stock" as "stock" | "crypto",
        cryptoId: "",
        quantity: Number.NaN,
        price: Number.NaN,
        type: "buy" as ShareTransaction['type'],
        date: new Date().toISOString().split('T')[0],
        description: ""
    })
    const formatHoldingAmount = (amount: number, isCrypto: boolean) => {
        if (!Number.isFinite(amount)) return "0"
        if (isCrypto) {
            if (amount === 0) return "0"
            const sign = amount < 0 ? "-" : ""
            const abs = Math.abs(amount)
            const adjusted = abs < 0.01 ? 0.01 : abs
            return `${sign}${adjusted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
        }
        return amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
    }
    const formatUnits = (units: number) => {
        if (!Number.isFinite(units)) return "0"
        if (units === 0) return "0"
        if (Math.abs(units) < 1) {
            return units.toLocaleString(undefined, { maximumFractionDigits: 10 })
        }
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
    const isFiniteNumber = (value: unknown): value is number =>
        typeof value === "number" && Number.isFinite(value)
    const safeNumber = useCallback((value?: number) => (isFiniteNumber(value) ? value : 0), [])

    // Helper to show custom confirmation modal
    const showConfirm = useCallback((title: string, description: string, onConfirm: () => void, confirmText = "Confirm", destructive = false) => {
        setConfirmModal({ open: true, title, description, onConfirm, confirmText, destructive })
    }, [])

    useEffect(() => {
        if (!isShareFeaturesEnabled && viewMode !== "overview") {
            setViewMode("overview")
        }
    }, [isShareFeaturesEnabled, viewMode])

    useEffect(() => {
        if (!isStockDetailOpen || !selectedStock) return

        const selectedSymbol = normalizeStockSymbol(selectedStock.symbol)
        const selectedAssetType = selectedStock.assetType || "stock"
        const selectedCryptoId = (selectedStock.cryptoId || "").trim()

        const latestMatch = portfolio.find((entry) => {
            const entrySymbol = normalizeStockSymbol(entry.symbol)
            const entryAssetType = entry.assetType || "stock"
            const entryCryptoId = (entry.cryptoId || "").trim()
            return (
                entry.portfolioId === selectedStock.portfolioId &&
                entrySymbol === selectedSymbol &&
                entryAssetType === selectedAssetType &&
                entryCryptoId === selectedCryptoId
            )
        })

        if (!latestMatch) return

        if (portfolioItemSyncSignature(latestMatch) === portfolioItemSyncSignature(selectedStock)) {
            return
        }

        setSelectedStock(latestMatch)
    }, [isStockDetailOpen, portfolio, selectedStock])

    // Handle stock transaction custom event from stock detail modal
    useEffect(() => {
        const handleStockTransaction = (event: CustomEvent) => {
            const { symbol, assetType, cryptoId, price, type, portfolioId } = event.detail
            setNewTx({
                symbol: symbol,
                assetType: assetType || 'stock',
                cryptoId: cryptoId || '',
                quantity: Number.NaN,
                price: price || Number.NaN,
                type: type || 'buy',
                date: new Date().toISOString().split('T')[0],
                description: `${type || 'buy'} ${symbol}`
            })
            
            // Open the transaction dialog
            setIsAddDialogOpen(true)
        }

        window.addEventListener('openStockTransaction', handleStockTransaction as EventListener)
        
        return () => {
            window.removeEventListener('openStockTransaction', handleStockTransaction as EventListener)
        }
    }, [setNewTx, setIsAddDialogOpen])

    const portfolioSymbols = useMemo(
        () => portfolio.map((p) => p.symbol).sort().join(","),
        [portfolio]
    )

    // `fetchPortfolioPrices` from context is not useCallback-stable — listing it in deps re-ran this effect every render and could exceed React's max update depth.
    const portfolioRef = useRef(portfolio)
    const fetchPortfolioPricesRef = useRef(fetchPortfolioPrices)

    // Update refs in effect to avoid accessing refs during render
    useEffect(() => {
        portfolioRef.current = portfolio
        fetchPortfolioPricesRef.current = fetchPortfolioPrices
    }, [portfolio, fetchPortfolioPrices])

    // Auto-refresh data on mount and every 3 minutes (when holdings set or share/crypto fetch rules change)
    useEffect(() => {
        const items = portfolioRef.current
        if (items.length === 0) return

        const stockItems = items.filter((p) => p.assetType !== "crypto" && !p.cryptoId)
        const cryptoItems = items.filter((p) => p.assetType === "crypto" || Boolean(p.cryptoId))
        const shouldFetchStocks = isShareFeaturesEnabled && stockItems.length > 0
        const shouldFetchCrypto = cryptoItems.length > 0

        if (!shouldFetchStocks && !shouldFetchCrypto) return

        const tick = () => {
            if (typeof document !== "undefined" && document.hidden) return
            const latest = portfolioRef.current
            if (latest.length === 0) return
            void fetchPortfolioPricesRef.current(latest)
        }

        tick()
        const interval = setInterval(tick, 3 * 60 * 1000)
        return () => clearInterval(interval)
    }, [isShareFeaturesEnabled, portfolioSymbols])

    const enableShareFeatures = () => {
        updateUserProfile({
            meroShare: {
                dpId: userProfile?.meroShare?.dpId || "",
                username: userProfile?.meroShare?.username || "",
                password: userProfile?.meroShare?.password || "",
                crn: userProfile?.meroShare?.crn || "",
                pin: userProfile?.meroShare?.pin || "",
                preferredKitta: userProfile?.meroShare?.preferredKitta || 0,
                applyMode: userProfile?.meroShare?.applyMode || "on-demand",
                showLiveBrowser: userProfile?.meroShare?.showLiveBrowser || false,
                isAutomatedEnabled: userProfile?.meroShare?.isAutomatedEnabled || false,
                applicationLogs: userProfile?.meroShare?.applicationLogs || [],
                shareFeaturesEnabled: true,
                shareNotificationsEnabled: true,
            }
        })
        toast.success("Share features enabled")
    }

    const handleViewStockDetail = (item: PortfolioItem) => {
        setSelectedStockDetailMode(showSoldStocks ? "sold" : "holding")
        const isCrypto = item.assetType === "crypto" || Boolean(item.cryptoId)
        if (isCrypto) {
            fetchPortfolioPrices([item], true)
                .then((updated) => {
                    const match = updated?.find((entry) => {
                        if (entry.id === item.id) return true
                        const entrySymbol = normalizeStockSymbol(entry.symbol)
                        const itemSymbol = normalizeStockSymbol(item.symbol)
                        const entryAssetType = entry.assetType || "stock"
                        const itemAssetType = item.assetType || "stock"
                        const entryCryptoId = (entry.cryptoId || "").trim()
                        const itemCryptoId = (item.cryptoId || "").trim()
                        return (
                            entry.portfolioId === item.portfolioId &&
                            entrySymbol === itemSymbol &&
                            entryAssetType === itemAssetType &&
                            entryCryptoId === itemCryptoId
                        )
                    })
                    setSelectedStock(match || item)
                    setIsStockDetailOpen(true)
                })
                .catch(() => {
                    setSelectedStock(item)
                    setIsStockDetailOpen(true)
                })
            return
        }
        setSelectedStock(item)
        setIsStockDetailOpen(true)
    }

    const handleViewIPODetail = (ipo: UpcomingIPO) => {
        setSelectedIPO(ipo)
        setIsIPODetailOpen(true)
    }

    const toggleIPOExpansion = (company: string) => {
        setExpandedIPOs(prev => {
            const next = new Set(prev)
            if (next.has(company)) next.delete(company)
            else next.add(company)
            return next
        })
    }

   
    const deferredSearchQuery = useDeferredValue(searchQuery)

    const filteredPortfolio = useMemo(
        () =>
            portfolio.filter(
                (item) =>
                    item.portfolioId === activePortfolioId &&
                    item.symbol.toLowerCase().includes(deferredSearchQuery.toLowerCase()) &&
                    item.units > 0,
            ),
        [portfolio, activePortfolioId, deferredSearchQuery],
    )

    const portfolioTransactions = useMemo(
        () => shareTransactions.filter((t) => t.portfolioId === activePortfolioId),
        [shareTransactions, activePortfolioId],
    )

    const soldPortfolioRows = useMemo(() => {
        const itemLookup = new Map<string, PortfolioItem>()
        portfolio
            .filter((item) => item.portfolioId === activePortfolioId)
            .forEach((item) => {
                const key = [
                    normalizeStockSymbol(item.symbol),
                    item.assetType || "stock",
                    (item.cryptoId || "").trim(),
                ].join("|")
                itemLookup.set(key, item)
            })

        const grouped = new Map<string, ShareTransaction[]>()
        portfolioTransactions
            .filter((tx) => tx.type === "sell")
            .forEach((tx) => {
                const key = [
                    normalizeStockSymbol(tx.symbol),
                    tx.assetType || "stock",
                    (tx.cryptoId || "").trim(),
                ].join("|")
                grouped.set(key, [...(grouped.get(key) || []), tx])
            })

        return Array.from(grouped.entries())
            .map(([key, sellTxs]) => {
                const [symbol, assetType, cryptoId] = key.split("|")
                const existingItem = itemLookup.get(key)
                const sortedSellTxs = [...sellTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                const latestSell = sortedSellTxs[0]
                const soldQuantity = sellTxs.reduce((sum, tx) => sum + safeNumber(tx.quantity), 0)
                const soldValue = sellTxs.reduce((sum, tx) => sum + safeNumber(tx.quantity) * safeNumber(tx.price), 0)
                const fallbackPrice = soldValue > 0 && soldQuantity > 0 ? soldValue / soldQuantity : 0
                const item: PortfolioItem = existingItem || {
                    id: `sold-${activePortfolioId}-${key}`,
                    portfolioId: activePortfolioId || latestSell.portfolioId,
                    symbol: symbol || latestSell.symbol,
                    assetType: assetType === "crypto" ? "crypto" : "stock",
                    cryptoId,
                    assetName: scripNamesMap?.[symbol] || symbol || latestSell.symbol,
                    units: 0,
                    buyPrice: fallbackPrice,
                    currentPrice: fallbackPrice,
                    sector: assetType === "crypto" || cryptoId ? "Crypto" : "Others",
                    isKeptZeroHolding: true,
                }

                return {
                    item,
                    sellTxs: sortedSellTxs,
                    latestSell,
                    soldQuantity,
                    soldValue,
                    latestSellAt: new Date(latestSell.date).getTime(),
                }
            })
            .filter((row) => {
                const query = deferredSearchQuery.toLowerCase()
                if (!query) return true
                return (
                    row.item.symbol.toLowerCase().includes(query) ||
                    (row.item.assetName || "").toLowerCase().includes(query)
                )
            })
            .sort((a, b) => b.latestSellAt - a.latestSellAt)
    }, [activePortfolioId, deferredSearchQuery, portfolio, portfolioTransactions, safeNumber, scripNamesMap])

    const soldPortfolioRowsByItemId = useMemo(() => {
        const rows = new Map<string, (typeof soldPortfolioRows)[number]>()
        soldPortfolioRows.forEach((row) => rows.set(row.item.id, row))
        return rows
    }, [soldPortfolioRows])

    const sortedTransactions = useMemo(
        () =>
            [...portfolioTransactions].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            ),
        [portfolioTransactions],
    )
    const stockOptions = useMemo(
        () =>
            Object.entries(scripNamesMap || {})
                .map(([symbol, name]) => ({ symbol, name }))
                .sort((a, b) => a.symbol.localeCompare(b.symbol)),
        [scripNamesMap],
    )
    const portfolioStockOptions = useMemo(() => {
        const bySymbol = new Map<string, string>()
        portfolio
            .filter((item) => item.portfolioId === activePortfolioId && (showSoldStocks || item.units > 0))
            .filter((item) => item.assetType !== "crypto" && !item.cryptoId)
            .forEach((item) => {
                const symbol = normalizeStockSymbol(item.symbol)
                const name = scripNamesMap?.[symbol] || item.assetName || symbol
                if (!bySymbol.has(symbol)) bySymbol.set(symbol, name)
            })
        return Array.from(bySymbol.entries())
            .map(([symbol, name]) => ({ symbol, name }))
            .sort((a, b) => a.symbol.localeCompare(b.symbol))
    }, [portfolio, activePortfolioId, scripNamesMap, showSoldStocks])
    const portfolioCryptoOptions = useMemo(() => {
        const byKey = new Map<string, { id?: string; symbol: string; name?: string }>()
        portfolio
            .filter((item) => item.portfolioId === activePortfolioId)
            .filter((item) => item.assetType === "crypto" || Boolean(item.cryptoId))
            .forEach((item) => {
                const key = item.cryptoId || item.symbol
                if (!byKey.has(key)) {
                    byKey.set(key, {
                        id: item.cryptoId,
                        symbol: item.symbol,
                        name: item.assetName,
                    })
                }
            })
        return Array.from(byKey.values()).sort((a, b) => a.symbol.localeCompare(b.symbol))
    }, [portfolio, activePortfolioId])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            // Recalculate units and cost basis from transactions
            await recomputePortfolio()
            // Fetch latest prices for all items
            await fetchPortfolioPrices(undefined, true)
            // Refresh market feeds used by overview and notifications as part of the same manual sync.
            await refreshMarketData()
            toast.success("Portfolio and market data synced")
        } catch (error: any) {
            toast.error(error.message || "Failed to sync portfolio")
        } finally {
            setIsRefreshing(false)
        }
    }

    const handleAddTransaction = async () => {
        const hasValidQty = Number.isFinite(newTx.quantity) && newTx.quantity > 0
        const hasValidPrice = newTx.type === 'bonus' || newTx.type === 'gift' || (Number.isFinite(newTx.price) && newTx.price > 0)
        if (!newTx.symbol || !hasValidQty || !hasValidPrice) {
            toast.error("Please fill all fields correctly")
            return
        }
        try {
            let resolvedSymbol = newTx.symbol.trim().toUpperCase()
            if (newTx.assetType === "stock") {
                const raw = newTx.symbol.trim()
                const rawLower = raw.toLowerCase()
                const exactSymbol = stockOptions.find((s) => s.symbol.toLowerCase() === rawLower)
                const exactName = stockOptions.find((s) => s.name.toLowerCase() === rawLower)
                if (exactSymbol) resolvedSymbol = exactSymbol.symbol
                else if (exactName) resolvedSymbol = exactName.symbol
            }

            let cryptoId: string | undefined = undefined
            if (newTx.assetType === "crypto") {
                if (newTx.cryptoId?.trim()) {
                    cryptoId = newTx.cryptoId.trim()
                } else {
                    const symbol = newTx.symbol.trim().toUpperCase()
                    const resolveRes = await fetch(`/api/crypto/coinlore/resolve?symbol=${encodeURIComponent(symbol)}`)
                    const resolveData = await resolveRes.json()
                    if (!resolveRes.ok) {
                        throw new Error(resolveData?.error || `Unable to resolve Coinlore symbol: ${symbol}`)
                    }
                    cryptoId = resolveData.id
                }
            }

            const { updatedPortfolio, zeroUnitHoldings } = await addShareTransaction({
                portfolioId: activePortfolioId!,
                symbol: resolvedSymbol,
                assetType: newTx.assetType,
                cryptoId,
                quantity: newTx.quantity,
                price: newTx.price,
                type: newTx.type,
                date: newTx.date,
                description: newTx.description || `${newTx.type.toUpperCase()} ${newTx.quantity} units of ${newTx.symbol}`
            })

            setNewTx({
                symbol: "",
                assetType: "stock",
                cryptoId: "",
                quantity: Number.NaN,
                price: Number.NaN,
                type: "buy",
                date: new Date().toISOString().split('T')[0],
                description: ""
            })
            setIsAddDialogOpen(false)
            setActiveTab("holdings")
            toast.success("Transaction recorded")
            fetchPortfolioPrices(updatedPortfolio)

            // Show sell confirmation modal if any holding hit zero units (and feature is enabled)
            if (zeroUnitHoldings && zeroUnitHoldings.length > 0) {
                if (zeroHoldingsEnabled) {
                    const firstHolding = zeroUnitHoldings[0]
                    setSellConfirmModal({
                        open: true,
                        symbol: firstHolding.symbol,
                        assetType: firstHolding.assetType,
                        cryptoId: firstHolding.cryptoId,
                        portfolioId: firstHolding.portfolioId,
                    })
                } else {
                    // Feature disabled - auto-remove zero holdings
                    for (const holding of zeroUnitHoldings) {
                        const item = updatedPortfolio.find(
                            (p) =>
                                p.portfolioId === holding.portfolioId &&
                                normalizeStockSymbol(p.symbol) === normalizeStockSymbol(holding.symbol) &&
                                p.assetType === (holding.assetType || "stock") &&
                                (p.cryptoId || "") === (holding.cryptoId || "")
                        )
                        if (item) {
                            await toggleZeroHolding(item.id, false)
                            await deletePortfolioItem(item.id)
                        }
                    }
                    toast.info("Zero holdings auto-removed (feature disabled)")
                }
            }
        } catch (error) {
            toast.error("Failed to record transaction")
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

    const handleSellConfirmKeep = async () => {
        toast.success(`${sellConfirmModal.symbol} kept as zero-unit holding`)
        setSellConfirmModal({ open: false, symbol: "", portfolioId: "" })
    }

    const handleSellConfirmRemove = async () => {
        const item = portfolio.find(
            (p) =>
                p.portfolioId === sellConfirmModal.portfolioId &&
                normalizeStockSymbol(p.symbol) === normalizeStockSymbol(sellConfirmModal.symbol) &&
                p.assetType === (sellConfirmModal.assetType || "stock") &&
                (p.cryptoId || "") === (sellConfirmModal.cryptoId || "")
        )
        if (item) {
            // Mark as explicitly removed (isKeptZeroHolding = false)
            await toggleZeroHolding(item.id, false)
            await deletePortfolioItem(item.id)
            toast.info(`${sellConfirmModal.symbol} removed from portfolio`)
        }
        setSellConfirmModal({ open: false, symbol: "", portfolioId: "" })
    }

    const handleDisableZeroHoldings = () => {
        setZeroHoldingsEnabled(false)
        // Update user profile to persist this preference
        updateUserProfile({
            settings: {
                ...userProfile?.settings,
                zeroHoldingsEnabled: false
            }
        })
        toast.info("Zero holdings feature disabled. Sold stocks will be auto-removed.")
    }

    const handleCreatePortfolio = async () => {
        if (!newPortfolio.name.trim()) {
            toast.error("Please enter a portfolio name")
            return
        }

        try {
            await addPortfolio(newPortfolio.name, newPortfolio.description, newPortfolio.color)
            setNewPortfolio({
                name: "",
                description: "",
                color: "#3b82f6"
            })
            setIsCreatePortfolioOpen(false)
            toast.success("Portfolio created successfully")
        } catch (error) {
            toast.error("Failed to create portfolio")
        }
    }

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImportDemo = async (fileName: string) => {
        try {
            const response = await fetch(`/demo data/${fileName}`)
            const csvData = await response.text()
            const updated = await importShareData('auto', csvData)
            toast.success(`Demo data ${fileName} loaded successfully`)
            if (updated) fetchPortfolioPrices(updated)
        } catch (error) {
            toast.error(`Failed to load demo data`)
        }
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            const content = e.target?.result as string
            if (!content) return

            try {
                const rows = content.split('\n').map(row => row.split(',').map(cell => cell.replace(/"/g, '').trim()))
                if (rows.length < 2) return

                const header = rows[0].join(',')
                let type: 'portfolio' | 'history' = 'portfolio'
                if (header.includes('Transaction Date') || header.includes('History Description')) {
                    type = 'history'
                }

                const symbolsToPrice = new Map<string, ImportQueueItem>()
                const transactionPriceQueue: ImportQueueItem[] = []

                if (type === 'portfolio') {
                    rows.slice(1).forEach(row => {
                        if (row.length < 7 || row[0].toLowerCase().includes('total')) return
                        const symbol = row[1]
                        const ltp = parseFloat(row[5]) || parseFloat(row[3]) || 100
                        if (symbol) {
                            symbolsToPrice.set(symbol, { id: symbol, symbol, defaultPrice: ltp, type: 'Holding' })
                        }
                    })
                } else {
                    rows.slice(1).forEach((row, rowIndex) => {
                        if (row.length < 7) return
                        const symbol = row[1]
                        const date = row[2]
                        const desc = row[6]
                        const credit = parseFloat(row[3]) || 0
                        const upperDesc = desc.toUpperCase()
                        const isBonus = upperDesc.includes('CA-BONUS') || upperDesc.includes('BONUS') || upperDesc.includes('CA-RIGHTS')
                        const isIpo = upperDesc.includes('IPO') || upperDesc.includes('INITIAL PUBLIC OFFERING')
                        const isMerger = upperDesc.includes('MERGER') && credit > 0
                        const isBuy = !isIpo && !isMerger && !isBonus && credit > 0

                        if (symbol && (isIpo || isBuy || isMerger)) {
                            const typeStr = isIpo ? 'IPO' : (isMerger ? 'Merger' : 'Buy')
                            const def = (isIpo || isMerger) ? getFaceValue(symbol) : 0
                            if (isBuy) {
                                symbolsToPrice.set(symbol, { id: symbol, symbol, defaultPrice: def, type: typeStr })
                            } else if (isIpo && !symbolsToPrice.has(symbol)) {
                                symbolsToPrice.set(symbol, { id: symbol, symbol, defaultPrice: def, type: typeStr })
                            }
                            if (isBuy) {
                                transactionPriceQueue.push({
                                    id: `${symbol}__row_${rowIndex + 1}`,
                                    symbol,
                                    defaultPrice: def,
                                    type: typeStr,
                                    date,
                                    quantity: credit,
                                    description: desc,
                                    priceOptional: true,
                                })
                            }
                        }
                    })
                }

                if (symbolsToPrice.size > 0) {
                    const queue = Array.from(symbolsToPrice.values())
                    const initialPrices: Record<string, string> = {}
                    queue.forEach(item => {
                        initialPrices[item.symbol] = item.defaultPrice.toString()
                    })
                    const initialTransactionPrices: Record<string, string> = {}
                    transactionPriceQueue.forEach(item => {
                        initialTransactionPrices[item.id] = item.defaultPrice > 0 ? item.defaultPrice.toString() : ""
                    })
                    setImportPrices(initialPrices)
                    setImportTransactionPrices(initialTransactionPrices)
                    if (transactionPriceQueue.length > 0) {
                        setImportQueue([...queue, ...transactionPriceQueue])
                    } else {
                        setImportQueue(queue)
                    }
                    setPendingImport({ type, data: content })
                    setIsImportModalOpen(true)
                } else {
                    const updated = await importShareData(type, content)
                    toast.success("Data imported successfully")
                    if (updated) fetchPortfolioPrices(updated)
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to parse CSV")
            }
        }
        reader.readAsText(file)
        if (event.target) event.target.value = '' // Clear input
    }

    const handleConfirmImport = async () => {
        if (!pendingImport) return

        try {
            const resolved: Record<string, number> = {}
            Object.entries(importPrices).forEach(([sym, price]) => {
                resolved[sym] = parseFloat(price) || 0
            })
            Object.entries(importTransactionPrices).forEach(([id, price]) => {
                const parsed = parseFloat(price)
                if (Number.isFinite(parsed) && parsed > 0) {
                    resolved[id] = parsed
                }
            })

            const updated = await importShareData(pendingImport.type as any, pendingImport.data, resolved)
            setIsImportModalOpen(false)
            setPendingImport(null)
            setImportTransactionPrices({})
            toast.success("Data imported with cost prices")
            // Refresh with the newly imported data
            if (updated) fetchPortfolioPrices(updated)
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const triggerFileUpload = () => {
        if (!fileInputRef.current) return
        fileInputRef.current.value = ""
        fileInputRef.current.click()
    }

    const toggleTxSelection = (id: string) => {
        setSelectedTxs(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        )
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedTxs(sortedTransactions.map(t => t.id))
        } else {
            setSelectedTxs([])
        }
    }

    const handleDeleteSelected = async () => {
        if (selectedTxs.length === 0) return

        showConfirm(
            "Delete Transactions",
            `Are you sure you want to delete ${selectedTxs.length} transactions? This will recalculate your portfolio.`,
            async () => {
                try {
                    const updatedPortfolio = await deleteMultipleShareTransactions(selectedTxs)
                    setSelectedTxs([])
                    toast.success(`${selectedTxs.length} transactions deleted and portfolio updated`)
                    fetchPortfolioPrices(updatedPortfolio)
                } catch (error) {
                    toast.error("Failed to delete transactions")
                }
            },
            "Delete",
            true
        )
    }

    // Calculations
    const activePortfolioItems = useMemo(
        () => portfolio.filter((p) => p.portfolioId === activePortfolioId),
        [portfolio, activePortfolioId],
    )

    const activePortfolioItemsForCalculations = useMemo(
        () => activePortfolioItems.filter((item) => item.units > 0),
        [activePortfolioItems],
    )

    const { totalInvestment, currentValue, totalProfitLoss, totalProfitLossPercentage, todayChange, todayChangePercentage } = useMemo(() => {
        const investment = activePortfolioItemsForCalculations.reduce((sum, item) => sum + item.units * safeNumber(item.buyPrice), 0)
        const current = activePortfolioItemsForCalculations.reduce((sum, item) => {
            const price = isFiniteNumber(item.currentPrice) ? item.currentPrice : safeNumber(item.buyPrice)
            return sum + item.units * price
        }, 0)
        const profitLoss = current - investment
        const today = activePortfolioItemsForCalculations.reduce((sum, item) => {
            if (!hasFreshDailyQuote(item)) return sum
            const currentPrice = isFiniteNumber(item.currentPrice) ? item.currentPrice : null
            const previousClose = isFiniteNumber(item.previousClose) ? item.previousClose : null
            if (currentPrice !== null && previousClose !== null) {
                return sum + item.units * (currentPrice - previousClose)
            }
            return sum
        }, 0)

        return {
            totalInvestment: investment,
            currentValue: current,
            totalProfitLoss: profitLoss,
            totalProfitLossPercentage: investment > 0 ? (profitLoss / investment) * 100 : 0,
            todayChange: today,
            todayChangePercentage: current - today > 0 ? (today / (current - today)) * 100 : 0,
        }
    }, [activePortfolioItems, safeNumber])

    const capitalSummaryByPortfolioId = useMemo(() => {
        const summaries = new Map<string, { freshInvestment: number; reinvestment: number }>()
        portfolios.forEach((p) => summaries.set(p.id, { freshInvestment: 0, reinvestment: 0 }))

        shareTransactions.forEach((tx) => {
            const amount = Number.isFinite(tx.quantity) && Number.isFinite(tx.price) ? tx.quantity * tx.price : 0
            if (amount <= 0) return

            const prev = summaries.get(tx.portfolioId) || { freshInvestment: 0, reinvestment: 0 }
            if (tx.type === "reinvestment") {
                summaries.set(tx.portfolioId, {
                    ...prev,
                    reinvestment: prev.reinvestment + amount,
                })
                return
            }

            if (tx.type === "buy" || tx.type === "ipo" || tx.type === "merger_in") {
                summaries.set(tx.portfolioId, {
                    ...prev,
                    freshInvestment: prev.freshInvestment + amount,
                })
            }
        })

        return summaries
    }, [portfolios, shareTransactions])

    const includedPortfolioIds = useMemo(
        () => new Set(portfolios.filter((p) => p.includeInTotals !== false).map((p) => p.id)),
        [portfolios],
    )

    const getInvestmentBreakdown = useCallback((portfolioId?: string | null) => {
        const selectedItems = portfolio.filter((item) => !portfolioId || item.portfolioId === portfolioId)
        const currentInvested = selectedItems
            .filter((item) => item.units > 0)
            .reduce((sum, item) => sum + item.units * safeNumber(item.buyPrice), 0)

        if (portfolioId) {
            const capitalSummary = capitalSummaryByPortfolioId.get(portfolioId) || { freshInvestment: 0, reinvestment: 0 }
            return {
                currentInvested,
                freshInvestment: capitalSummary.freshInvestment,
                reinvestment: capitalSummary.reinvestment,
            }
        }

        return portfolios
            .filter((p) => includedPortfolioIds.has(p.id))
            .reduce(
                (sum, p) => {
                    const capitalSummary = capitalSummaryByPortfolioId.get(p.id) || { freshInvestment: 0, reinvestment: 0 }
                    return {
                        currentInvested,
                        freshInvestment: sum.freshInvestment + capitalSummary.freshInvestment,
                        reinvestment: sum.reinvestment + capitalSummary.reinvestment,
                    }
                },
                { currentInvested, freshInvestment: 0, reinvestment: 0 },
            )
    }, [capitalSummaryByPortfolioId, includedPortfolioIds, portfolio, portfolios, safeNumber])

    const openInvestmentBreakdown = useCallback((title: string, portfolioId?: string | null) => {
        setInvestmentBreakdownModal({
            open: true,
            title,
            portfolioId: portfolioId ?? null,
        })
    }, [])

    const soldPortfolioStats = useMemo(() => {
        const holdingLookup = new Map<string, PortfolioItem>()
        activePortfolioItems.forEach((item) => {
            const key = [
                normalizeStockSymbol(item.symbol),
                item.assetType || "stock",
                (item.cryptoId || "").trim(),
            ].join("|")
            holdingLookup.set(key, item)
        })

        const sectorMap = new Map<string, { value: number; count: number; units: number; symbols: Set<string> }>()
        const scripMap = new Map<string, { value: number; units: number; sector: string }>()
        const comparisonMap = new Map<string, {
            symbol: string
            sector: string
            units: number
            soldValue: number
            todayValue: number
        }>()
        const soldSymbols = new Set<string>()
        let totalSoldValue = 0
        let totalSoldTodayValue = 0
        let totalSoldUnits = 0
        let latestSoldAt = 0

        portfolioTransactions.forEach((tx) => {
            if (tx.type !== "sell") return
            const quantity = safeNumber(tx.quantity)
            const price = safeNumber(tx.price)
            const value = quantity * price
            if (quantity <= 0) return

            const symbol = normalizeStockSymbol(tx.symbol)
            const key = [symbol, tx.assetType || "stock", (tx.cryptoId || "").trim()].join("|")
            const holding = holdingLookup.get(key)
            const sector = holding?.sector || (tx.assetType === "crypto" || tx.cryptoId ? "Crypto" : "Others")
            const displaySymbol = symbol || tx.symbol
            const txDate = new Date(tx.date).getTime()
            const currentPrice = isFiniteNumber(holding?.currentPrice)
                ? holding.currentPrice
                : (isFiniteNumber(holding?.buyPrice) ? holding.buyPrice : price)
            const todayValue = quantity * currentPrice

            totalSoldValue += value
            totalSoldTodayValue += todayValue
            totalSoldUnits += quantity
            soldSymbols.add(displaySymbol)
            if (Number.isFinite(txDate)) latestSoldAt = Math.max(latestSoldAt, txDate)

            const currentSector = sectorMap.get(sector) || { value: 0, count: 0, units: 0, symbols: new Set<string>() }
            currentSector.value += value
            currentSector.units += quantity
            currentSector.symbols.add(displaySymbol)
            currentSector.count = currentSector.symbols.size
            sectorMap.set(sector, currentSector)

            const currentScrip = scripMap.get(displaySymbol) || { value: 0, units: 0, sector }
            scripMap.set(displaySymbol, {
                value: currentScrip.value + value,
                units: currentScrip.units + quantity,
                sector: currentScrip.sector || sector,
            })

            const currentComparison = comparisonMap.get(displaySymbol) || {
                symbol: displaySymbol,
                sector,
                units: 0,
                soldValue: 0,
                todayValue: 0,
            }
            comparisonMap.set(displaySymbol, {
                ...currentComparison,
                units: currentComparison.units + quantity,
                soldValue: currentComparison.soldValue + value,
                todayValue: currentComparison.todayValue + todayValue,
            })
        })

        const reinvestedAmount = portfolioTransactions.reduce((sum, tx) => {
            if (tx.type !== "reinvestment") return sum
            const amount = safeNumber(tx.quantity) * safeNumber(tx.price)
            return amount > 0 ? sum + amount : sum
        }, 0)

        const totalBase = chartMetric === "units" ? totalSoldUnits : totalSoldValue
        const sectorData = Array.from(sectorMap.entries())
            .map(([name, data]) => ({
                name,
                value: data.value,
                count: data.count,
                units: data.units,
                color: getSectorColor(name),
                percentage: totalBase > 0
                    ? ((chartMetric === "units" ? data.units : data.value) / totalBase) * 100
                    : 0,
            }))
            .sort((a, b) => (chartMetric === "units" ? b.units - a.units : b.value - a.value))

        const scripData = Array.from(scripMap.entries())
            .map(([name, data]) => ({
                name,
                value: data.value,
                units: data.units,
                sector: data.sector,
                color: getSectorVariantColor(data.sector, name),
                percentage: totalBase > 0
                    ? ((chartMetric === "units" ? data.units : data.value) / totalBase) * 100
                    : 0,
            }))
            .sort((a, b) => (chartMetric === "units" ? b.units - a.units : b.value - a.value))

        const comparisons = Array.from(comparisonMap.values())
            .map((row) => {
                const difference = row.todayValue - row.soldValue
                return {
                    ...row,
                    difference,
                    differencePercentage: row.soldValue > 0 ? (difference / row.soldValue) * 100 : 0,
                }
            })

        const missedUpsideRows = comparisons.filter((row) => row.difference > 0)
        const savedDownsideRows = comparisons.filter((row) => row.difference < 0)
        const flatRows = comparisons.filter((row) => Math.abs(row.differencePercentage) < 0.0001)

        const summarizeComparisonRows = (rows: typeof comparisons) => {
            const units = rows.reduce((sum, row) => sum + row.units, 0)
            const soldValue = rows.reduce((sum, row) => sum + row.soldValue, 0)
            const todayValue = rows.reduce((sum, row) => sum + row.todayValue, 0)
            const difference = todayValue - soldValue
            return {
                units,
                soldValue,
                todayValue,
                difference,
                differencePercentage: soldValue > 0 ? (difference / soldValue) * 100 : 0,
            }
        }

        const missedUpside = missedUpsideRows
            .sort((a, b) => b.differencePercentage - a.differencePercentage)
            .slice(0, 5)

        const savedDownside = savedDownsideRows
            .sort((a, b) => a.differencePercentage - b.differencePercentage)
            .slice(0, 5)

        const flat = flatRows
            .sort((a, b) => b.units - a.units)
            .slice(0, 5)

        return {
            totalSoldValue,
            totalSoldTodayValue,
            soldValueDifference: totalSoldTodayValue - totalSoldValue,
            soldValueDifferencePercentage: totalSoldValue > 0 ? ((totalSoldTodayValue - totalSoldValue) / totalSoldValue) * 100 : 0,
            totalSoldUnits,
            soldScrips: soldSymbols.size,
            soldSectors: sectorMap.size,
            reinvestedAmount,
            reinvestedPercentage: totalSoldValue > 0 ? (reinvestedAmount / totalSoldValue) * 100 : 0,
            latestSoldAt,
            sectorData,
            scripData,
            missedUpside,
            savedDownside,
            flat,
            missedUpsideTotal: summarizeComparisonRows(missedUpsideRows),
            savedDownsideTotal: summarizeComparisonRows(savedDownsideRows),
            flatTotal: summarizeComparisonRows(flatRows),
        }
    }, [activePortfolioItems, chartMetric, portfolioTransactions, safeNumber])

    const { sectorData, scripData } = useMemo(() => {
        const sectorMap = new Map<string, { value: number; count: number; units: number }>()
        const scripMap = new Map<string, { value: number; units: number; sector: string }>()
        let unitsSum = 0

        activePortfolioItemsForCalculations.forEach((item) => {
            const sector = item.sector || "Others"
            const safePrice = isFiniteNumber(item.currentPrice)
                ? item.currentPrice
                : safeNumber(item.buyPrice)
            const safeUnits = safeNumber(item.units)
            const value = safeUnits * safePrice
            unitsSum += safeUnits
            const currentSector = sectorMap.get(sector) || { value: 0, count: 0, units: 0 }

            sectorMap.set(sector, {
                value: currentSector.value + value,
                count: currentSector.count + 1,
                units: currentSector.units + safeUnits,
            })
            const currentScrip = scripMap.get(item.symbol) || { value: 0, units: 0, sector }
            scripMap.set(item.symbol, {
                value: currentScrip.value + value,
                units: currentScrip.units + safeUnits,
                sector: currentScrip.sector || sector,
            })
        })

        const totalBase = chartMetric === "units" ? unitsSum : currentValue

        const memoSectorData = Array.from(sectorMap.entries())
            .map(([name, data]) => ({
                name,
                value: data.value,
                count: data.count,
                units: data.units,
                color: getSectorColor(name),
                percentage: totalBase > 0
                    ? ((chartMetric === "units" ? data.units : data.value) / totalBase) * 100
                    : 0,
            }))
            .filter((item) => item.units > 0 && item.value > 0)
            .sort((a, b) => (chartMetric === "units" ? b.units - a.units : b.value - a.value))

        const memoScripData = Array.from(scripMap.entries())
            .map(([name, data]) => ({
                name,
                value: data.value,
                units: data.units,
                sector: data.sector,
                color: getSectorVariantColor(data.sector, name),
                percentage: totalBase > 0
                    ? ((chartMetric === "units" ? data.units : data.value) / totalBase) * 100
                    : 0,
            }))
            .filter((item) => item.units > 0 && item.value > 0)
            .sort((a, b) => (chartMetric === "units" ? b.units - a.units : b.value - a.value))

        return { sectorData: memoSectorData, scripData: memoScripData }
    }, [activePortfolioItemsForCalculations, currentValue, chartMetric, safeNumber])

    const activeChartData = showSoldStocks
        ? (chartView === "sector" ? soldPortfolioStats.sectorData : soldPortfolioStats.scripData)
        : (chartView === "sector" ? sectorData : scripData)

    const portfolioMovers = useMemo(() => {
        const rows = activePortfolioItemsForCalculations
            .map((item) => {
                if (!hasFreshDailyQuote(item)) return null
                const symbol = normalizeStockSymbol(item.symbol)
                if (!symbol) return null
                const safeUnits = safeNumber(item.units)
                const currentPrice = isFiniteNumber(item.currentPrice)
                    ? item.currentPrice
                    : safeNumber(item.buyPrice)
                const previousClose = isFiniteNumber(item.previousClose) ? item.previousClose : undefined
                const changePerUnit = isFiniteNumber(item.change)
                    ? item.change
                    : (previousClose !== undefined ? currentPrice - previousClose : 0)
                const percentChange = isFiniteNumber(item.percentChange)
                    ? item.percentChange
                    : (previousClose ? (changePerUnit / previousClose) * 100 : 0)
                if (!Number.isFinite(percentChange)) return null

                const displayName = item.assetType === "crypto" || item.cryptoId
                    ? (item.assetName || symbol)
                    : (scripNamesMap[symbol] || item.assetName || symbol)
                const valueChange = safeUnits * changePerUnit

                return {
                    id: item.id,
                    symbol,
                    name: displayName,
                    percentChange,
                    units: safeUnits,
                    valueChange,
                    item,
                }
            })
            .filter((row): row is NonNullable<typeof row> => Boolean(row))

        const gainers = rows
            .filter((row) => row.percentChange > 0)
            .sort((a, b) => b.percentChange - a.percentChange)
            .slice(0, 5)

        const losers = rows
            .filter((row) => row.percentChange < 0)
            .sort((a, b) => a.percentChange - b.percentChange)
            .slice(0, 5)

        const noMovers = rows
            .filter((row) => Math.abs(row.percentChange) < 0.0001)
            .sort((a, b) => b.units - a.units)
            .slice(0, 5)

        const topMoversProfit = gainers.reduce((sum, row) => sum + row.valueChange, 0)
        const topLosersLoss = losers.reduce((sum, row) => sum + Math.abs(row.valueChange), 0)

        return { gainers, losers, noMovers, topMoversProfit, topLosersLoss }
    }, [activePortfolioItemsForCalculations, scripNamesMap, safeNumber])
    const hasMoverData = portfolioMovers.gainers.length > 0 || portfolioMovers.losers.length > 0
    const hasNoMoverData = portfolioMovers.noMovers.length > 0

    const portfolioSummaryById = useMemo(() => {
        const summaries = new Map<string, { investment: number; current: number; count: number; todayChange: number }>()
        portfolios.forEach((p) => summaries.set(p.id, { investment: 0, current: 0, count: 0, todayChange: 0 }))

        portfolio.forEach((item) => {
            const prev = summaries.get(item.portfolioId) || { investment: 0, current: 0, count: 0, todayChange: 0 }
            const currentPrice = isFiniteNumber(item.currentPrice) ? item.currentPrice : (isFiniteNumber(item.buyPrice) ? item.buyPrice : 0)
            const previousClose = isFiniteNumber(item.previousClose) ? item.previousClose : currentPrice
            const itemTodayChange = hasFreshDailyQuote(item) ? item.units * (currentPrice - previousClose) : 0

            summaries.set(item.portfolioId, {
                investment: prev.investment + item.units * (isFiniteNumber(item.buyPrice) ? item.buyPrice : 0),
                current: prev.current + item.units * currentPrice,
                count: prev.count + (item.units > 0 ? 1 : 0),
                todayChange: prev.todayChange + itemTodayChange,
            })
        })

        return summaries
    }, [portfolio, portfolios])

    const handleTogglePortfolioIncluded = async (portfolioToToggle: Portfolio) => {
        try {
            const nextValue = portfolioToToggle.includeInTotals === false
            await updatePortfolio(portfolioToToggle.id, { includeInTotals: nextValue })
            toast.success(nextValue ? "Portfolio included in totals" : "Portfolio excluded from totals")
        } catch (error) {
            toast.error("Could not update portfolio visibility in totals")
        }
    }

    const handleEditPortfolioDetails = (portfolioToEdit: Portfolio) => {
        setEditingPortfolio(portfolioToEdit)
        setIsEditPortfolioOpen(true)
    }

    const handleSavePortfolio = async (id: string, updates: Partial<Portfolio>) => {
        try {
            await updatePortfolio(id, updates)
            toast.success("Portfolio details updated")
        } catch (error) {
            toast.error("Failed to update portfolio details")
            throw error
        }
    }

    const marketSnapshot = useMemo(() => {
        const topGainers = [...(topStocks?.top_gainer || [])]
            .filter((item) => Number.isFinite(item.percentageChange))
            .sort((a, b) => b.percentageChange - a.percentageChange)
            .slice(0, 5)
        const topLosers = [...(topStocks?.top_loser || [])]
            .filter((item) => Number.isFinite(item.percentageChange))
            .sort((a, b) => a.percentageChange - b.percentageChange)
            .slice(0, 5)
        const topTurnover = [...(topStocks?.top_turnover || [])]
            .filter((item) => item.symbol)
            .slice(0, 5)
        const turnoverMetric = marketSummary.find((metric) =>
            (metric.detail || "").toLowerCase().includes("turnover"),
        )

        return {
            topGainers,
            topLosers,
            topTurnover,
            turnover: typeof turnoverMetric?.value === "number" ? turnoverMetric.value : null,
        }
    }, [topStocks, marketSummary])

    const marketStatusMeta = useMemo(() => {
        const statusText = marketStatus?.isOpen === true
            ? "OPEN"
            : marketStatus?.isOpen === false
                ? "CLOSED"
                : (marketStatus?.status || "UNKNOWN").toUpperCase()

        const badgeClass = marketStatus?.isOpen === true
            ? "border-success/30 bg-success/10 text-success"
            : marketStatus?.isOpen === false
                ? "border-error/30 bg-error/10 text-error"
                : "border-muted/40 bg-muted/20 text-muted-foreground"

        const dotClass = marketStatus?.isOpen === true
            ? "bg-success animate-pulse"
            : marketStatus?.isOpen === false
                ? "bg-error"
                : "bg-muted-foreground"

        return {
            statusText,
            badgeClass,
            dotClass,
        }
    }, [marketStatus])

    const getMarketSymbolName = useCallback((symbol: string) => {
        const normalized = normalizeStockSymbol(symbol)
        return scripNamesMap[normalized] || normalized
    }, [scripNamesMap])

    const marketHistorySeries = useMemo(() => {
        if (!Array.isArray(marketSummaryHistory) || marketSummaryHistory.length === 0) return []

        const parseBusinessDate = (value: string) => {
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
            if (!match) return null
            const year = Number(match[1])
            const month = Number(match[2])
            const day = Number(match[3])
            if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
            if (month < 1 || month > 12 || day < 1 || day > 31) return null
            return { year, month, day }
        }

        const normalized = [...marketSummaryHistory]
            .map((row) => {
                const parsed = row.businessDate ? parseBusinessDate(row.businessDate) : null
                if (!parsed) return null
                return {
                    ...row,
                    parsed,
                    sortTs: Date.UTC(parsed.year, parsed.month - 1, parsed.day),
                }
            })
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
            .sort((a, b) => a.sortTs - b.sortTs)

        if (marketHistoryView === "yearly") {
            const byYear = new Map<string, { turnover: number; transactions: number }>()
            normalized.forEach((row) => {
                const year = row.parsed.year.toString()
                const prev = byYear.get(year) || { turnover: 0, transactions: 0 }
                byYear.set(year, {
                    turnover: prev.turnover + (row.totalTurnover || 0),
                    transactions: prev.transactions + (row.totalTransactions || 0),
                })
            })

            const yearlySeries = Array.from(byYear.entries())
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([year, value]) => ({
                    date: year,
                    turnoverCr: Number((value.turnover / 10000000).toFixed(2)),
                    transactionsK: Number((value.transactions / 1000).toFixed(1)),
                }))

            if (yearWindow === "all") return yearlySeries
            return yearlySeries.slice(-Number(yearWindow))
        }

        const dailySeries = normalized.map((row) => ({
            date: new Date(row.sortTs).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
            turnoverCr: Number(((row.totalTurnover || 0) / 10000000).toFixed(2)),
            transactionsK: Number(((row.totalTransactions || 0) / 1000).toFixed(1)),
        }))

        return dailySeries.slice(-Number(dayWindow))
    }, [marketSummaryHistory, marketHistoryView, yearWindow, dayWindow])

    const overviewNotifications = useMemo(() => {
        const toDocuments = (docs?: NepseDisclosure["applicationDocumentDetailsList"]) =>
            (docs || [])
                .map((doc) => {
                    const resolvedUrl = resolveNepseDocumentUrl(doc.fileUrl || doc.filePath || null)
                    if (!resolvedUrl) return null
                    const label = (doc.fileUrl || doc.filePath || "Document").split("/").pop() || "Document"
                    return { label, url: resolvedUrl }
                })
                .filter((doc): doc is { label: string; url: string } => Boolean(doc))

        const general = (noticesBundle?.general || []).slice(0, 6).map((n) => ({
            id: `general-${n.id}`,
            title: "NEPSE Notice",
            text: n.noticeHeading || "General market notice available.",
            tone: "info" as const,
            category: "general" as const,
            timestamp: parseDateToTimestamp((n as { addedDate?: string }).addedDate),
            details: n.noticeHeading || "No details available for this notice.",
            documents: [] as Array<{ label: string; url: string }>,
            actionLabel: "Read Notice",
        }))
        const company = disclosures.slice(0, 6).map((d) => ({
            id: `disclosure-${d.id}`,
            title: "Company Disclosure",
            text: d.newsHeadline || "A company disclosure was published.",
            tone: "warning" as const,
            category: "disclosure" as const,
            timestamp: parseDateToTimestamp(d.addedDate),
            details: stripHtml(d.newsBody) || d.newsHeadline || "No details available for this disclosure.",
            documents: toDocuments(d.applicationDocumentDetailsList),
            actionLabel: d.applicationDocumentDetailsList?.length ? "Open Filing" : "Read Disclosure",
        }))
        const exchange = exchangeMessages.slice(0, 6).map((m) => ({
            id: `exchange-${m.id}`,
            title: "Exchange Message",
            text: m.messageTitle || "A new exchange message is available.",
            tone: "success" as const,
            category: "exchange" as const,
            timestamp: parseDateToTimestamp(m.expiryDate),
            details: stripHtml(m.messageBody) || m.messageTitle || "No details available for this exchange message.",
            documents: (() => {
                const url = resolveNepseDocumentUrl(m.filePath || null)
                return url ? [{ label: "Exchange Circular", url }] : []
            })(),
            actionLabel: m.filePath ? "Open Circular" : "Read Message",
        }))
        const ipoItems = upcomingIPOs.slice(0, 6).map((ipo, index) => ({
            id: `ipo-${ipo.company}-${ipo.status || "unknown"}-${ipo.openingDate || ipo.announcement_date || ipo.date_range || ipo.url || index}-${index}`,
            title: ipo.status === "open" ? "IPO Open Now" : ipo.status === "upcoming" ? "IPO Opening Soon" : "IPO Update",
            text: `${ipo.company}${ipo.status === "open" ? " is open for application." : ipo.status === "upcoming" ? " is coming soon." : " IPO details are available."}`,
            tone: ipo.status === "open" ? "success" as const : ipo.status === "upcoming" ? "info" as const : "warning" as const,
            category: "ipo" as const,
            timestamp: parseDateToTimestamp(ipo.openingDate || ipo.announcement_date || ipo.scraped_at),
            details: ipo.full_text || `${ipo.company} IPO timeline: ${ipo.date_range}.`,
            documents: [] as Array<{ label: string; url: string }>,
            actionLabel: ipo.status === "open" ? "Apply / View" : "View IPO",
            ipo,
        }))

        return [...ipoItems, ...general, ...company, ...exchange]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 14)
    }, [noticesBundle, disclosures, exchangeMessages, upcomingIPOs])

    const overviewNotificationsWithMeta = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })

        return overviewNotifications.map((item) => ({
            ...item,
            dateLabel: item.timestamp ? formatter.format(new Date(item.timestamp)) : "Recently",
        }))
    }, [overviewNotifications])

    const selectedOverviewNotification = useMemo(
        () => overviewNotificationsWithMeta.find((item) => item.id === selectedOverviewNotificationId) || null,
        [overviewNotificationsWithMeta, selectedOverviewNotificationId],
    )

    const overviewNotificationStats = useMemo(() => ({
        total: overviewNotificationsWithMeta.length,
        ipo: overviewNotificationsWithMeta.filter((item) => item.category === "ipo").length,
        filings: overviewNotificationsWithMeta.filter((item) => item.documents.length > 0).length,
    }), [overviewNotificationsWithMeta])

    const getOverviewNotificationIcon = (category: string) => {
        if (category === "ipo") return <BellRing className="w-4 h-4" />
        if (category === "disclosure") return <FileText className="w-4 h-4" />
        if (category === "exchange") return <Activity className="w-4 h-4" />
        return <Info className="w-4 h-4" />
    }

    const ipoInsights = useMemo(() => {
        const normalizeIpoName = (value?: string) =>
            (value || "")
                .toLowerCase()
                .replace(/\b(limited|ltd|public|private|pvt|co|company|inc)\b/g, "")
                .replace(/[().,-]/g, "")
                .replace(/\s+/g, " ")
                .trim()

        const isIpoApplied = (ipo: UpcomingIPO) =>
            Boolean(
                userProfile?.meroShare?.applicationLogs?.some(
                    (log) =>
                        log.action === "apply" &&
                        log.status === "success" &&
                        normalizeIpoName(log.ipoName) === normalizeIpoName(ipo.company),
                ),
            )

        const parseSortableIpoDate = (value?: string) => {
            if (!value) return Number.POSITIVE_INFINITY
            const parsed = new Date(value)
            const timestamp = parsed.getTime()
            return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
        }

        const ipoStatusOrder: Record<string, number> = { open: 0, upcoming: 1, closed: 2 }
        const sortedIPOs = [...upcomingIPOs].sort((a, b) => {
            const aRank = ipoStatusOrder[a.status ?? ""] ?? 3
            const bRank = ipoStatusOrder[b.status ?? ""] ?? 3
            if (aRank !== bRank) return aRank - bRank

            if (a.status === "open" && b.status === "open") {
                const closingDateDiff =
                    parseSortableIpoDate(a.closingDate) - parseSortableIpoDate(b.closingDate)
                if (closingDateDiff !== 0) return closingDateDiff

                const aApplied = isIpoApplied(a)
                const bApplied = isIpoApplied(b)
                if (aApplied !== bApplied) return aApplied ? 1 : -1
            }

            if (a.status === "upcoming" && b.status === "upcoming") {
                const openingDateDiff =
                    parseSortableIpoDate(a.openingDate) - parseSortableIpoDate(b.openingDate)
                if (openingDateDiff !== 0) return openingDateDiff
            }

            return 0
        })

        const filteredIPOs =
            ipoFilter === "all" ? sortedIPOs : sortedIPOs.filter((ipo) => ipo.status === ipoFilter)
        const openIpoCount = upcomingIPOs.filter((ipo) => ipo.status === "open").length
        const upcomingIpoCount = upcomingIPOs.filter((ipo) => ipo.status === "upcoming").length
        const closedIpoCount = upcomingIPOs.filter((ipo) => ipo.status === "closed").length
        const statusSummaryLabel =
            openIpoCount > 0 ? "Open Now" : upcomingIpoCount > 0 ? "Upcoming" : "Recent"

        const groupedIPOsMap = new Map<string, UpcomingIPO[]>()
        filteredIPOs.forEach((ipo) => {
            const list = groupedIPOsMap.get(ipo.company) || []
            groupedIPOsMap.set(ipo.company, [...list, ipo])
        })

        const groupedIPOs = Array.from(groupedIPOsMap.entries()).map(([company, items]) => ({
            company,
            items
        }))

        const displayedIPOs = showAllIPOs ? groupedIPOs : groupedIPOs.slice(0, 5)
        const sentiment =
            openIpoCount >= 3
                ? {
                    label: "Strong Bullish",
                    toneClass: "text-success",
                    description: `${openIpoCount} IPOs are open right now, showing strong current participation.`,
                }
                : openIpoCount > 0
                    ? {
                        label: "Bullish",
                        toneClass: "text-success",
                        description: `${openIpoCount} IPO ${openIpoCount === 1 ? "is" : "are"} open now, with ${upcomingIpoCount} in the pipeline.`,
                    }
                    : upcomingIpoCount > 0
                        ? {
                            label: "Building Momentum",
                            toneClass: "text-info",
                            description: `No IPO is open today, but ${upcomingIpoCount} ${upcomingIpoCount === 1 ? "is" : "are"} upcoming soon.`,
                        }
                        : {
                            label: "Calm Window",
                            toneClass: "text-muted-foreground",
                            description: `No open or upcoming IPOs right now. Recently closed: ${closedIpoCount}.`,
                        }

        const appliedIpoKeys = new Set(
            sortedIPOs
                .filter((ipo) => isIpoApplied(ipo))
                .map((ipo) => `${ipo.company}-${ipo.date_range}-${ipo.status ?? "unknown"}`),
        )

        return {
            sortedIPOsCount: sortedIPOs.length,
            filteredIPOsCount: groupedIPOs.length,
            openIpoCount,
            upcomingIpoCount,
            closedIpoCount,
            statusSummaryLabel,
            displayedIPOs, // This is now an array of { company, items }
            sentiment,
            appliedIpoKeys,
        }
    }, [ipoFilter, showAllIPOs, upcomingIPOs, userProfile?.meroShare?.applicationLogs])

    const openOverviewNotificationDetails = (id: string) => {
        const notification = overviewNotificationsWithMeta.find((item) => item.id === id)
        if (notification?.category === "ipo" && "ipo" in notification && notification.ipo) {
            handleViewIPODetail(notification.ipo)
            return
        }
        setSelectedOverviewNotificationId(id)
        setSelectedOverviewNotificationDocUrl(null)
    }

    const closeOverviewNotificationDetails = (open: boolean) => {
        if (open) return
        setSelectedOverviewNotificationId(null)
        setSelectedOverviewNotificationDocUrl(null)
    }

    const openOverviewNotificationDocument = (url: string) => {
        const previewUrl = isPdfLikeUrl(url)
            ? `/api/proxy/pdf?url=${encodeURIComponent(url)}`
            : url
        setSelectedOverviewNotificationDocUrl(previewUrl)
    }

    const investmentBreakdown = useMemo(
        () => getInvestmentBreakdown(investmentBreakdownModal.portfolioId),
        [getInvestmentBreakdown, investmentBreakdownModal.portfolioId],
    )

    const renderInvestmentBreakdownModal = () => (
        <Dialog
            open={investmentBreakdownModal.open}
            onOpenChange={(open) => setInvestmentBreakdownModal((prev) => ({ ...prev, open }))}
        >
            <DialogContent className="max-w-md w-[94vw]">
                <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg font-black">
                        {investmentBreakdownModal.title || "Investment Breakdown"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-left">
                    <div className="rounded-xl border border-muted/30 bg-muted/5 p-3">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Current Invested</p>
                        <p className="mt-1 text-xl font-black font-mono">रु {investmentBreakdown.currentInvested.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Cost basis of holdings that are currently active.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <p className="text-[10px] uppercase font-black tracking-widest text-primary">Fresh Capital</p>
                            <p className="mt-1 text-lg font-black font-mono text-primary">रु {investmentBreakdown.freshInvestment.toLocaleString()}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">New money added by the user.</p>
                        </div>
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                            <p className="text-[10px] uppercase font-black tracking-widest text-cyan-700">Reinvestment</p>
                            <p className="mt-1 text-lg font-black font-mono text-cyan-700">रु {investmentBreakdown.reinvestment.toLocaleString()}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">Buys funded from previous sales.</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <p className="text-[10px] uppercase font-black tracking-widest text-amber-700">Note</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Fresh capital and reinvestment are historical funding sources, so they may differ from current invested value after sells or position rotation.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )

    const renderOverviewHeader = () => {
        const includedPortfolios = portfolios.filter((p) => includedPortfolioIds.has(p.id))
        const totalInvest = includedPortfolios.reduce((sum, p) => sum + (portfolioSummaryById.get(p.id)?.investment || 0), 0)
        const totalCurrent = includedPortfolios.reduce((sum, p) => sum + (portfolioSummaryById.get(p.id)?.current || 0), 0)
        const totalTodayChange = includedPortfolios.reduce((sum, p) => sum + (portfolioSummaryById.get(p.id)?.todayChange || 0), 0)
        const totalPl = totalCurrent - totalInvest
        const totalPlPerc = totalInvest > 0 ? (totalPl / totalInvest) * 100 : 0
        const previousTotalValue = totalCurrent - totalTodayChange
        const totalTodayChangePerc = previousTotalValue > 0 ? (totalTodayChange / previousTotalValue) * 100 : 0

        // Calculate diversification
        const uniqueSectors = new Set(portfolio.map(p => p.sector || "Others")).size
        const uniqueStocks = new Set(portfolio.map(p => p.symbol)).size
        const diversificationLabel = uniqueStocks > 15 ? "High" : uniqueStocks > 7 ? "Moderate" : "Low"
        const diversificationColor = uniqueStocks > 15 ? "text-success" : uniqueStocks > 7 ? "text-info" : "text-amber-500"

        return (
            <>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20 shadow-xl relative overflow-hidden group text-left col-span-2 md:col-span-1">
                    <CardHeader className="pb-2 px-3 sm:px-6">
                        <div className="flex items-center justify-between mb-1">
                            <CardDescription className="text-foreground/60 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Total Valuation</CardDescription>
                            <div className="p-1 sm:p-1.5 bg-primary/10 rounded-lg text-primary">
                                <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                        </div>
                        <CardTitle className="text-xl sm:text-2xl font-black font-mono tracking-tight">रु {totalCurrent.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <div className={cn(
                            "inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-tight shadow-sm",
                            totalPl >= 0 ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"
                        )}>
                            {totalPl >= 0 ? "+" : ""}{totalPl.toLocaleString()} ({totalPlPerc.toFixed(2)}%)
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md text-left">
                    <CardHeader className="pb-1 px-3 sm:px-6">
                        <div className="flex items-center justify-between mb-1">
                            <CardDescription className="text-foreground/60 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Today's Move</CardDescription>
                            <div className={cn(
                                "p-1 sm:p-1.5 rounded-lg",
                                totalTodayChange >= 0 ? "bg-success/10 text-success" : "bg-error/10 text-error"
                            )}>
                                {totalTodayChange >= 0 ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <CardTitle className={cn(
                                "text-xl sm:text-2xl font-black font-mono tracking-tight",
                                totalTodayChange >= 0 ? "text-success" : "text-error"
                            )}>
                                {totalTodayChange >= 0 ? "+" : ""}{totalTodayChange.toLocaleString()}
                            </CardTitle>
                            <div className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-tight",
                                totalTodayChange >= 0 ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"
                            )}>
                                {totalTodayChange >= 0 ? "+" : ""}{totalTodayChangePerc.toFixed(1)}%
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-4">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1 mt-1">
                            <span>Across:</span>
                            <span className="text-primary font-black">{portfolios.length} Portfolios</span>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md text-left cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => openInvestmentBreakdown("Total Investment Breakdown")}
                >
                    <CardHeader className="pb-2 px-3 sm:px-6">
                        <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Total Invested</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl font-black font-mono">रु {totalInvest.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest opacity-60">Cost Basis</span>
                    </CardContent>
                </Card>

                <Card className="hidden md:block bg-card/40 backdrop-blur-sm border-muted/50 shadow-md text-left">
                    <CardHeader className="pb-2 px-3 sm:px-6">
                        <div className="mb-1 flex items-start justify-between gap-2">
                            <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                                Diversification
                            </CardDescription>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "h-6 shrink-0 rounded-full border px-2.5 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                                    marketStatusMeta.badgeClass,
                                )}
                                title="Nepal Stock Exchange session"
                            >
                                <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", marketStatusMeta.dotClass)} />
                                NEPSE {marketStatusMeta.statusText}
                            </Badge>
                        </div>
                        <CardTitle className={cn("text-xl sm:text-2xl font-black font-mono", diversificationColor)}>{diversificationLabel}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[...Array(Math.min(uniqueSectors, 4))].map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                {uniqueSectors} Sectors
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-muted/50 bg-card/40 px-4 py-3 shadow-sm md:hidden">
                <div className="min-w-0 text-left">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Diversification</p>
                    <p className={cn("text-lg font-black font-mono leading-tight", diversificationColor)}>{diversificationLabel}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">
                        {uniqueStocks} symbols · {uniqueSectors} sectors
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className={cn(
                        "h-7 shrink-0 rounded-full border px-2.5 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                        marketStatusMeta.badgeClass,
                    )}
                    title="Nepal Stock Exchange session"
                >
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", marketStatusMeta.dotClass)} />
                    NEPSE {marketStatusMeta.statusText}
                </Badge>
            </div>
            </>
        )
    }

    const renderPortfolioCard = (p: Portfolio) => {
        const summary = portfolioSummaryById.get(p.id) || { investment: 0, current: 0, count: 0, todayChange: 0 };
        const isIncludedInTotals = p.includeInTotals !== false
        const profitLoss = summary.current - summary.investment;
        const profitPerc = summary.investment > 0 ? (profitLoss / summary.investment) * 100 : 0;
        const isProfit = profitLoss >= 0;
        const previousValue = summary.current - summary.todayChange;

        return (
            <Card
                key={p.id}
                className={cn(
                    "group cursor-pointer border-muted/50 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col text-left",
                    !isIncludedInTotals && "opacity-75 border-dashed",
                )}
                onClick={() => {
                    switchPortfolio(p.id)
                    setViewMode("detail")
                }}
            >
                <CardHeader className="pb-3 sm:pb-4 relative px-4 sm:px-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                                Portfolio
                            </Badge>
                            
                        </div>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary relative z-10"
                                title="Edit Portfolio Details"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleEditPortfolioDetails(p)
                                }}
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                title={isIncludedInTotals ? "Exclude from Total" : "Include in Total"}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    void handleTogglePortfolioIncluded(p)
                                }}
                            >
                                {isIncludedInTotals ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-500/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    showConfirm(
                                        "Delete Portfolio",
                                        `Are you sure you want to delete "${p.name}"? This action cannot be undone.`,
                                        () => deletePortfolio(p.id),
                                        "Delete",
                                        true
                                    );
                                }}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-black group-hover:text-primary transition-colors">{p.name}</CardTitle>
                    <CardDescription className="line-clamp-1 font-medium italic opacity-70 text-xs sm:text-sm">
                        {p.description || "Personal Investment Portfolio"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4 sm:pb-6 space-y-3 sm:space-y-4 px-4 sm:px-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Current Value</span>
                            <span className="text-base sm:text-lg font-black font-mono">रु {summary.current.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 items-end">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">today move</span>
                            <span className={cn(
                                "text-sm sm:text-base font-black font-mono leading-tight",
                                summary.todayChange >= 0 ? "text-success" : "text-error"
                            )}>
                                {summary.todayChange >= 0 ? "+" : ""}{summary.todayChange.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="pt-3 sm:pt-4 border-t border-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-muted/50 font-black text-[9px] sm:text-[10px] uppercase">
                                {summary.count} Scrips
                            </Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 sm:h-8 rounded-lg text-primary font-bold group-hover:bg-primary/5 text-xs sm:text-sm">
                            <span className="hidden sm:inline">View Details</span>
                            <span className="sm:hidden">View</span>
                            <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
                        </Button>
                    </div>
                </CardContent>
                <div className="h-1.5 w-full bg-muted/20">
                    <div
                        className={cn("h-full transition-all duration-1000", isProfit ? "bg-success" : "bg-error")}
                        style={{ width: `${Math.min(Math.abs(profitPerc), 100)}%` }}
                    />
                </div>
            </Card>
        )
    }

    if (viewMode === "overview") {
        if (!isShareFeaturesEnabled) {
            return (
                <>
                    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-primary/5 to-card shadow-xl">
                        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-left text-xl font-black tracking-tight">
                                        Share Features Disabled
                                    </CardTitle>
                                    <CardDescription className="text-left text-xs uppercase tracking-widest text-muted-foreground/80">
                                        Portfolio Mode
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <p className="max-w-xl text-left text-sm leading-relaxed text-muted-foreground">
                                Enable share features to unlock portfolio tracking, IPO actions, and share insights from this section.
                            </p>
                            <Button
                                onClick={enableShareFeatures}
                                className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 font-bold shadow-lg shadow-primary/20 hover:from-primary/90 hover:to-primary/70"
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Turn On Share Features
                            </Button>
                        </CardContent>
                    </Card>
                    <ConfirmationModal
                        open={confirmModal.open}
                        onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
                        title={confirmModal.title}
                        description={confirmModal.description}
                        onConfirm={() => confirmModal.onConfirm?.()}
                        confirmText={confirmModal.confirmText}
                        destructive={confirmModal.destructive}
                    />
                </>
            )
        }

        const {
            sortedIPOsCount,
            filteredIPOsCount,
            statusSummaryLabel,
            displayedIPOs,
            sentiment,
            appliedIpoKeys,
        } = ipoInsights

        return (
            <>
                {/* Global Modals for Overview */}
                <StockDetailModal
                    item={selectedStock}
                    open={isStockDetailOpen}
                    onOpenChange={setIsStockDetailOpen}
                    mode={selectedStockDetailMode}
                />
                <SellConfirmationModal
                    symbol={sellConfirmModal.symbol}
                    assetType={sellConfirmModal.assetType}
                    cryptoId={sellConfirmModal.cryptoId}
                    portfolioId={sellConfirmModal.portfolioId}
                    open={sellConfirmModal.open}
                    onOpenChange={(open) => setSellConfirmModal(prev => ({ ...prev, open }))}
                    onConfirmKeep={handleSellConfirmKeep}
                    onConfirmRemove={handleSellConfirmRemove}
                    onDisableZeroHoldings={handleDisableZeroHoldings}
                    shareTransactions={shareTransactions}
                    zeroHoldingsEnabled={zeroHoldingsEnabled}
                />
                <IPODetailModal
                    ipo={selectedIPO}
                    open={isIPODetailOpen}
                    onOpenChange={setIsIPODetailOpen}
                />
                <EditPortfolioModal
                    open={isEditPortfolioOpen}
                    onOpenChange={setIsEditPortfolioOpen}
                    portfolio={editingPortfolio}
                    onSave={handleSavePortfolio}
                />
                <ConfirmationModal
                    open={confirmModal.open}
                    onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
                    title={confirmModal.title}
                    description={confirmModal.description}
                    onConfirm={() => confirmModal.onConfirm?.()}
                    confirmText={confirmModal.confirmText}
                    destructive={confirmModal.destructive}
                />
                {renderInvestmentBreakdownModal()}
                <Dialog
                    open={Boolean(selectedOverviewNotification)}
                    onOpenChange={closeOverviewNotificationDetails}
                >
                    <DialogContent className="max-w-3xl w-[95vw] max-h-[88vh] overflow-hidden flex flex-col gap-0 p-0">
                        <DialogHeader className="border-b border-muted/30 px-5 py-4">
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                                    selectedOverviewNotification?.tone === "success" && "border-success/20 bg-success/10 text-success",
                                    selectedOverviewNotification?.tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-600",
                                    selectedOverviewNotification?.tone === "info" && "border-info/20 bg-info/10 text-info",
                                )}>
                                    {selectedOverviewNotification ? getOverviewNotificationIcon(selectedOverviewNotification.category) : <BellRing className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-sm sm:text-base font-black uppercase tracking-widest">
                                        {selectedOverviewNotification?.title || "Notification"}
                                    </DialogTitle>
                                    {selectedOverviewNotification ? (
                                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {selectedOverviewNotification.category} • {selectedOverviewNotification.dateLabel}
                                </p>
                                    ) : null}
                                </div>
                            </div>
                        </DialogHeader>
                        {selectedOverviewNotification && (
                            <ScrollArea className="flex-1 px-5 py-4">
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-muted/30 bg-muted/5 p-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
                                            Headline
                                        </p>
                                        <p className="text-sm font-semibold text-foreground/90">
                                            {selectedOverviewNotification.text}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-muted/30 bg-background/60 p-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
                                            Details
                                        </p>
                                        <p className="text-sm leading-relaxed text-foreground/90">
                                            {selectedOverviewNotification.details}
                                        </p>
                                    </div>
                                    {selectedOverviewNotification.documents.length > 0 && (
                                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                                            <div className="mb-2 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                <p className="text-xs font-black uppercase tracking-widest text-primary">
                                                    Filings
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedOverviewNotification.documents.map((doc, index) => (
                                                    <Button
                                                        key={`${doc.url}-${index}`}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 rounded-md text-[10px] font-black uppercase tracking-wider"
                                                        onClick={() => openOverviewNotificationDocument(doc.url)}
                                                    >
                                                        {doc.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2 border-t border-muted/20 pt-3 sm:flex-row">
                                        {selectedOverviewNotification.documents[0] && (
                                            <Button
                                                type="button"
                                                className="h-9 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                                onClick={() => openOverviewNotificationDocument(selectedOverviewNotification.documents[0].url)}
                                            >
                                                <FileText className="mr-2 w-3.5 h-3.5" />
                                                Open Filing
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-9 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                            onClick={() => closeOverviewNotificationDetails(false)}
                                        >
                                            Done
                                        </Button>
                                    </div>
                                    {selectedOverviewNotificationDocUrl && (
                                        <div className="rounded-xl border border-muted/30 overflow-hidden bg-card">
                                            <div className="flex items-center justify-between border-b border-muted/20 px-3 py-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Filing Preview
                                                </p>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-[10px] font-black uppercase tracking-wider"
                                                    onClick={() => setSelectedOverviewNotificationDocUrl(null)}
                                                >
                                                    Close Preview
                                                </Button>
                                            </div>
                                            <iframe
                                                src={selectedOverviewNotificationDocUrl}
                                                title="Filing Preview"
                                                className="w-full h-[60vh] bg-background"
                                            />
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </DialogContent>
                </Dialog>

                <div className="space-y-8 animate-in fade-in duration-500 text-left">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase">My Portfolios</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                title="Refresh Price & Sync Portfolio"
                                className="rounded-xl h-10 w-10 border-primary/20 hover:bg-primary/5 shadow-md shadow-primary/5 bg-card/40 backdrop-blur-sm group"
                            >
                                <RefreshCcw className={cn(
                                    "w-4 h-4 text-primary",
                                    isRefreshing && "animate-spin"
                                )} />
                            </Button>
                            <Button
                                onClick={() => setIsCreatePortfolioOpen(true)}
                                className="rounded-xl font-bold shadow-lg shadow-primary/20 px-6"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New
                            </Button>
                        </div>
                    </div>

                    <div className="mt-8">
                        {renderOverviewHeader()}
                        {(marketSnapshot.topGainers.length > 0 || marketSnapshot.topLosers.length > 0 || marketSnapshot.topTurnover.length > 0 || marketSnapshot.turnover !== null || overviewNotificationsWithMeta.length > 0) && (
                            <div className="mb-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-between rounded-xl font-black text-xs uppercase tracking-widest border-primary/20 bg-card/60"
                                    onClick={() => setIsOverviewFeedOpen((prev) => !prev)}
                                >
                                    Market & Notifications
                                    {isOverviewFeedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                                {isOverviewFeedOpen && (
                                    <Card className="mt-3 border-primary/20 bg-gradient-to-br from-primary/5 via-card/60 to-transparent text-left">
                                        <CardContent className="p-4 sm:p-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(marketSnapshot.topGainers.length > 0 || marketSnapshot.topLosers.length > 0 || marketSnapshot.topTurnover.length > 0 || marketSnapshot.turnover !== null) && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <BarChart3 className="w-4 h-4 text-primary" />
                                                            <h4 className="text-sm font-black uppercase tracking-widest">Market Snapshot</h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="text-[10px] uppercase font-black text-muted-foreground">Total Turnover</p>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "h-6 rounded-full px-2.5 text-[10px] font-black tracking-wider border inline-flex items-center gap-1.5",
                                                                            marketStatusMeta.badgeClass,
                                                                        )}
                                                                    >
                                                                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", marketStatusMeta.dotClass)} />
                                                                        MARKET {marketStatusMeta.statusText}
                                                                    </Badge>
                                                                </div>
                                                                <p className="mt-1 text-sm font-black truncate">
                                                                    {typeof marketSnapshot.turnover === "number"
                                                                        ? `NPR ${marketSnapshot.turnover.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                                        : "Not available right now"}
                                                                </p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="rounded-xl border border-success/20 bg-success/5 p-3">
                                                                    <p className="text-[10px] uppercase font-black text-success">Top Gainers</p>
                                                                    <div className="mt-2 space-y-1.5">
                                                                        {marketSnapshot.topGainers.slice(0, 5).map((item, index) => (
                                                                            <div key={`gainer-${item.symbol}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                                                                                <TooltipProvider>
                                                                                    <UITooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <span className="font-black uppercase cursor-help">{item.symbol}</span>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent side="top">
                                                                                            {getMarketSymbolName(item.symbol)}
                                                                                        </TooltipContent>
                                                                                    </UITooltip>
                                                                                </TooltipProvider>
                                                                                <div className="text-right">
                                                                                    <p className="font-black text-success">+{item.percentageChange.toFixed(2)}%</p>
                                                                                    <p className="text-[10px] text-muted-foreground">LTP {item.ltp.toLocaleString()}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {marketSnapshot.topGainers.length === 0 && (
                                                                            <p className="text-[11px] text-muted-foreground">No gainer data available.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-xl border border-error/20 bg-error/5 p-3">
                                                                    <p className="text-[10px] uppercase font-black text-error">Top Losers</p>
                                                                    <div className="mt-2 space-y-1.5">
                                                                        {marketSnapshot.topLosers.slice(0, 5).map((item, index) => (
                                                                            <div key={`loser-${item.symbol}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                                                                                <TooltipProvider>
                                                                                    <UITooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <span className="font-black uppercase cursor-help">{item.symbol}</span>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent side="top">
                                                                                            {getMarketSymbolName(item.symbol)}
                                                                                        </TooltipContent>
                                                                                    </UITooltip>
                                                                                </TooltipProvider>
                                                                                <div className="text-right">
                                                                                    <p className="font-black text-error">{item.percentageChange.toFixed(2)}%</p>
                                                                                    <p className="text-[10px] text-muted-foreground">LTP {item.ltp.toLocaleString()}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {marketSnapshot.topLosers.length === 0 && (
                                                                            <p className="text-[11px] text-muted-foreground">No loser data available.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                                                <p className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-300">Top Turnover Symbols</p>
                                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                                    {marketSnapshot.topTurnover.slice(0, 5).map((item, index) => (
                                                                        <TooltipProvider key={`turnover-${item.symbol}-${index}`}>
                                                                            <UITooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Badge variant="outline" className="h-6 rounded-md text-[10px] font-black cursor-help">
                                                                                        {item.symbol}
                                                                                    </Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top">
                                                                                    {getMarketSymbolName(item.symbol)}
                                                                                </TooltipContent>
                                                                            </UITooltip>
                                                                        </TooltipProvider>
                                                                    ))}
                                                                    {marketSnapshot.topTurnover.length === 0 && (
                                                                        <p className="text-[11px] text-muted-foreground">No turnover leaders available.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {overviewNotificationsWithMeta.length > 0 && (
                                                    <div>
                                                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <BellRing className="w-4 h-4 text-primary" />
                                                                <h4 className="text-sm font-black uppercase tracking-widest">Notification Center</h4>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <Badge variant="secondary" className="h-5 rounded-md text-[9px] font-black uppercase">
                                                                    {overviewNotificationStats.total} Alerts
                                                                </Badge>
                                                                {overviewNotificationStats.ipo > 0 && (
                                                                    <Badge className="h-5 rounded-md bg-success/10 text-success border-success/20 text-[9px] font-black uppercase">
                                                                        {overviewNotificationStats.ipo} IPO
                                                                    </Badge>
                                                                )}
                                                                {overviewNotificationStats.filings > 0 && (
                                                                    <Badge variant="outline" className="h-5 rounded-md text-[9px] font-black uppercase">
                                                                        {overviewNotificationStats.filings} Filings
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                                            {overviewNotificationsWithMeta.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className={cn(
                                                                        "group rounded-xl border px-3 py-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30",
                                                                        item.tone === "info" && "border-info/20 bg-info/5",
                                                                        item.tone === "warning" && "border-amber-500/20 bg-amber-500/5",
                                                                        item.tone === "success" && "border-success/20 bg-success/5",
                                                                    )}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => openOverviewNotificationDetails(item.id)}
                                                                    onKeyDown={(event) => {
                                                                        if (event.key === "Enter" || event.key === " ") {
                                                                            event.preventDefault()
                                                                            openOverviewNotificationDetails(item.id)
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex min-w-0 gap-3">
                                                                            <div className={cn(
                                                                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-105",
                                                                                item.tone === "info" && "border-info/20 bg-info/10 text-info",
                                                                                item.tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-600",
                                                                                item.tone === "success" && "border-success/20 bg-success/10 text-success",
                                                                            )}>
                                                                                {getOverviewNotificationIcon(item.category)}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                                                        {item.title}
                                                                                    </p>
                                                                                    {item.documents.length > 0 && (
                                                                                        <Badge variant="outline" className="h-4 rounded px-1 text-[8px] font-black uppercase">
                                                                                            {item.documents.length} Doc
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            <p className="text-xs font-semibold text-foreground/90 line-clamp-3">
                                                                                {item.text}
                                                                            </p>
                                                                                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                                    <Calendar className="w-3 h-3" />
                                                                                    {item.dateLabel}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <Badge variant="secondary" className="h-5 text-[9px] font-black uppercase">
                                                                            {item.category}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-current/10 pt-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 rounded-md px-2 text-[10px] font-black uppercase tracking-wider"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation()
                                                                                openOverviewNotificationDetails(item.id)
                                                                            }}
                                                                        >
                                                                            {item.actionLabel}
                                                                            <ArrowUpRight className="ml-1.5 w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {overviewNotificationsWithMeta.length === 0 && (
                                                                <div className="rounded-xl border border-dashed border-muted/50 bg-muted/10 px-3 py-4 text-center">
                                                                    <p className="text-xs font-semibold text-muted-foreground">
                                                                        No notifications right now.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {marketHistorySeries.length > 0 && (
                                                <div className="mt-4 border-t border-primary/10 pt-4">
                                                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full sm:w-auto rounded-lg font-black text-[10px] uppercase tracking-widest border-primary/20"
                                                            onClick={() => setIsMarketHistoryOpen((prev) => !prev)}
                                                        >
                                                            {isMarketHistoryOpen ? "Hide Market History Chart" : "Show Market History Chart"}
                                                            {isMarketHistoryOpen ? <ChevronUp className="ml-2 w-3.5 h-3.5" /> : <ChevronDown className="ml-2 w-3.5 h-3.5" />}
                                                        </Button>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Select value={marketHistoryView} onValueChange={(value) => setMarketHistoryView(value as "yearly" | "daily")}>
                                                                <SelectTrigger className="h-8 w-full rounded-lg text-[10px] font-black uppercase tracking-wider border-primary/20">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="yearly">Yearly</SelectItem>
                                                                    <SelectItem value="daily">Daily</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            {marketHistoryView === "yearly" ? (
                                                            <Select value={yearWindow} onValueChange={(value) => setYearWindow(value as "5" | "10" | "all")}>
                                                                <SelectTrigger className="h-8 w-full rounded-lg text-[10px] font-black uppercase tracking-wider border-primary/20">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="5">Last 5Y</SelectItem>
                                                                    <SelectItem value="10">Last 10Y</SelectItem>
                                                                    <SelectItem value="all">All Years</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            ) : (
                                                                <Select value={dayWindow} onValueChange={(value) => setDayWindow(value as "30" | "90" | "365")}>
                                                                    <SelectTrigger className="h-8 w-full rounded-lg text-[10px] font-black uppercase tracking-wider border-primary/20">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="30">Last 30D</SelectItem>
                                                                        <SelectItem value="90">Last 90D</SelectItem>
                                                                        <SelectItem value="365">Last 1Y</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 sm:ml-auto">
                                                            <Button
                                                                type="button"
                                                                variant={historySeriesMode === "both" ? "default" : "outline"}
                                                                size="sm"
                                                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                                                onClick={() => setHistorySeriesMode("both")}
                                                            >
                                                                Both
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant={historySeriesMode === "turnover" ? "default" : "outline"}
                                                                size="sm"
                                                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider border-primary/30 text-primary"
                                                                onClick={() => setHistorySeriesMode("turnover")}
                                                            >
                                                                Turnover
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant={historySeriesMode === "transactions" ? "default" : "outline"}
                                                                size="sm"
                                                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                                                onClick={() => setHistorySeriesMode("transactions")}
                                                            >
                                                                Transactions
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    {isMarketHistoryOpen && (
                                                        <div className="mt-3 h-[240px] rounded-xl border border-primary/10 bg-background/50 p-2">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={marketHistorySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                                                    {(historySeriesMode === "both" || historySeriesMode === "turnover") && (
                                                                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--primary))" }} />
                                                                    )}
                                                                    {(historySeriesMode === "both" || historySeriesMode === "transactions") && (
                                                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#10b981" }} />
                                                                    )}
                                                                    <Tooltip
                                                                        content={({ active, payload, label }) => {
                                                                            if (!active || !payload || payload.length === 0) return null
                                                                            const turnoverValue = payload.find((p) => p.dataKey === "turnoverCr")?.value
                                                                            const txValue = payload.find((p) => p.dataKey === "transactionsK")?.value
                                                                            return (
                                                                                <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2">
                                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                                                                        {marketHistoryView === "yearly" ? `Year ${label}` : label}
                                                                                    </p>
                                                                                    {(historySeriesMode === "both" || historySeriesMode === "turnover") && (
                                                                                        <p className="text-xs font-bold text-primary">
                                                                                            Turnover: {typeof turnoverValue === "number" ? turnoverValue.toFixed(2) : turnoverValue} Cr
                                                                                        </p>
                                                                                    )}
                                                                                    {(historySeriesMode === "both" || historySeriesMode === "transactions") && (
                                                                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                                            Transactions: {typeof txValue === "number" ? txValue.toFixed(1) : txValue} K
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            )
                                                                        }}
                                                                    />
                                                                    {(historySeriesMode === "both" || historySeriesMode === "turnover") && (
                                                                        <Line
                                                                            type="monotone"
                                                                            yAxisId="left"
                                                                            dataKey="turnoverCr"
                                                                            name="Turnover (Cr)"
                                                                            stroke="#f97316"
                                                                            strokeWidth={3}
                                                                            dot={false}
                                                                            activeDot={{ r: 4, strokeWidth: 0, fill: "#f97316" }}
                                                                        />
                                                                    )}
                                                                    {(historySeriesMode === "both" || historySeriesMode === "transactions") && (
                                                                        <Line
                                                                            type="monotone"
                                                                            yAxisId="right"
                                                                            dataKey="transactionsK"
                                                                            name="Transactions (K)"
                                                                            stroke="#10b981"
                                                                            strokeWidth={2.5}
                                                                            dot={false}
                                                                            activeDot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
                                                                        />
                                                                    )}
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                            {portfolios.map(p => renderPortfolioCard(p))}
                        </div>
                        {portfolios.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-muted/50 rounded-3xl bg-muted/5 text-center">
                                <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-bold">No portfolios yet</h3>
                                <p className="text-muted-foreground mb-6">Create your first portfolio to start tracking your investments.</p>
                                <Button
                                    onClick={() => setIsCreatePortfolioOpen(true)}
                                    className="rounded-xl font-bold px-8"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Your First Portfolio
                                </Button>
                            </div>
                        )}
                        <CreatePortfolioModal
                            open={isCreatePortfolioOpen}
                            onOpenChange={setIsCreatePortfolioOpen}
                            newPortfolio={newPortfolio}
                            setNewPortfolio={setNewPortfolio}
                            onCreate={handleCreatePortfolio}
                        />
                    </div>


                    <div className="pt-8">
                        <div className="flex items-center gap-2 mb-6 ml-1">
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            <h3 className="text-xl font-black tracking-tight uppercase tracking-widest text-foreground/80">Market Opportunities</h3>
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {isIPOsLoading ? (
                                <Card className="border-primary/20 bg-card shadow-xl overflow-hidden backdrop-blur-sm text-left">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-primary/10">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-16 bg-primary/20" />
                                            <Skeleton className="h-6 w-48 bg-muted" />
                                        </div>
                                        <Skeleton className="h-8 w-16 bg-muted rounded-lg" />
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-muted/10">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-center justify-between p-5">
                                                    <div className="space-y-3 w-full">
                                                        <Skeleton className="h-5 w-2/3 bg-muted/40" />
                                                        <div className="flex gap-4">
                                                            <Skeleton className="h-3 w-32 bg-muted/20" />
                                                            <Skeleton className="h-3 w-20 bg-muted/20" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="h-9 w-28 bg-primary/10 rounded-xl ml-4" />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : sortedIPOsCount > 0 ? (
                                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-xl overflow-hidden backdrop-blur-sm text-left">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-primary/10">
                                        <div>
                                            <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest mb-1.5 px-2">
                                                {statusSummaryLabel}
                                            </Badge>
                                            <CardTitle className="text-lg font-black flex items-center gap-2"> IPOs & Rights</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={ipoFilter}
                                                onValueChange={(value) => {
                                                    setIpoFilter(value as "all" | "open" | "upcoming" | "closed")
                                                    setShowAllIPOs(false)
                                                }}
                                            >
                                                <SelectTrigger className="h-8 w-[120px] rounded-lg text-[11px] font-black uppercase tracking-wider border-primary/20 bg-card/60">
                                                    <SelectValue placeholder="Filter" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="open">Open</SelectItem>
                                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                                    <SelectItem value="closed">Closed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {filteredIPOsCount > 5 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-lg text-primary text-[11px] font-black uppercase tracking-wider"
                                                    onClick={() => setShowAllIPOs((prev) => !prev)}
                                                >
                                                    {showAllIPOs ? "Show Less" : "See All"}
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-muted/10">
                                            {displayedIPOs.length > 0 ? displayedIPOs.map((group) => {
                                                const { company, items } = group;
                                                const hasMultiple = items.length > 1;
                                                const isExpanded = expandedIPOs.has(company);

                                                // For the header, we can use the first item to show some basic info
                                                const firstIpo = items[0];
                                                const statusColor = firstIpo.status === 'open' ? 'text-success bg-success/10 border-success/20' :
                                                    firstIpo.status === 'upcoming' ? 'text-info bg-info/10 border-info/20' :
                                                        'text-muted-foreground bg-muted/20 border-muted/30';

                                                return (
                                                    <div key={company} className="flex flex-col border-b last:border-0 border-muted/10">
                                                        <div
                                                            className="group/item flex flex-row items-start sm:items-center justify-between p-4 sm:p-5 hover:bg-primary/[0.02] transition-all relative overflow-hidden gap-3 sm:gap-4 cursor-pointer"
                                                            onClick={() => hasMultiple ? toggleIPOExpansion(company) : handleViewIPODetail(firstIpo)}
                                                            role="button"
                                                            tabIndex={0}
                                                        >
                                                            <div className="flex flex-col gap-1.5 relative z-10 min-w-0 flex-1 text-left">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-black text-sm text-foreground/90 group-hover/item:text-primary transition-colors leading-tight truncate max-w-[200px] sm:max-w-none">
                                                                        {company}
                                                                    </span>
                                                                    {hasMultiple && (
                                                                        <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0 border-primary/30 bg-primary/5 text-primary">
                                                                            {items.length} Offerings
                                                                        </Badge>
                                                                    )}
                                                                    {!hasMultiple && firstIpo.status && (
                                                                        <Badge className={cn("text-[10px] font-black uppercase px-2 py-0 border", statusColor)}>
                                                                            {firstIpo.status === 'open' ? 'Open Today' : firstIpo.status.charAt(0).toUpperCase() + firstIpo.status.slice(1)}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {!hasMultiple && (
                                                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight mr-2">
                                                                            {firstIpo.date_range}
                                                                        </div>
                                                                        {firstIpo.is_reserved_share && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                title={firstIpo.reserved_for || "Reserved IPO share"}
                                                                                className="px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-tight border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                                                            >
                                                                                Reserved
                                                                            </Badge>
                                                                        )}
                                                                        {appliedIpoKeys.has(`${firstIpo.company}-${firstIpo.date_range}-${firstIpo.status ?? "unknown"}`) && (
                                                                            <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 border-success/30 bg-success/10 text-success">
                                                                                Applied
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {hasMultiple && (
                                                                    <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight italic">
                                                                        {isExpanded ? "Click to collapse" : "Click to view different types"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {hasMultiple && (
                                                                    <div className={cn("transition-transform duration-200 p-2 rounded-full hover:bg-primary/10", isExpanded ? "rotate-180" : "")}>
                                                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                {!hasMultiple && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="flex items-center justify-center gap-2 bg-background hover:bg-primary text-foreground/70 hover:text-primary-foreground px-2 py-2 sm:px-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-sm border border-border group-hover/item:border-primary/30 group-hover/item:shadow-lg group-hover/item:shadow-primary/10 relative z-10 shrink-0 h-9 w-9 sm:w-auto"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleViewIPODetail(firstIpo);
                                                                        }}
                                                                    >
                                                                        <span className="hidden sm:inline">View Info</span>
                                                                        <Info className="hidden sm:block w-3 h-3" />
                                                                        <ChevronRight className="sm:hidden w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {hasMultiple && isExpanded && (
                                                            <div className="bg-muted/5 divide-y divide-muted/10 animate-in slide-in-from-top-2 duration-200 border-t border-muted/5">
                                                                {items.map((ipo) => {
                                                                    const ipoKey = `${ipo.company}-${ipo.date_range}-${ipo.status ?? "unknown"}`
                                                                    const isApplied = appliedIpoKeys.has(ipoKey)
                                                                    const subStatusColor = ipo.status === 'open' ? 'text-success bg-success/10 border-success/20' :
                                                                        ipo.status === 'upcoming' ? 'text-info bg-info/10 border-info/20' :
                                                                            'text-muted-foreground bg-muted/20 border-muted/30';

                                                                    return (
                                                                        <div
                                                                            key={ipoKey}
                                                                            className="flex items-center justify-between p-4 pl-6 sm:pl-10 hover:bg-primary/[0.03] transition-colors cursor-pointer group/sub"
                                                                            onClick={() => handleViewIPODetail(ipo)}
                                                                        >
                                                                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    {ipo.is_reserved_share && (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            title={ipo.reserved_for || "Reserved IPO share"}
                                                                                            className="px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-tight border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-none"
                                                                                        >
                                                                                            Reserved
                                                                                        </Badge>
                                                                                    )}
                                                                                    <span className="text-xs font-black text-foreground/80 truncate group-hover/sub:text-primary">
                                                                                        {ipo.is_reserved_share ? (ipo.reserved_for || "Reserved Share") : "General Share Offering"}
                                                                                    </span>
                                                                                    {isApplied && (
                                                                                        <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0.5 border-success/30 bg-success/10 text-success shadow-none">
                                                                                            Applied
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                                                                    <span>{ipo.units} Units</span>
                                                                                    <span className="opacity-40 font-normal">•</span>
                                                                                    <span>{ipo.date_range}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 shrink-0">
                                                                                <div className={cn(
                                                                                    "px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tight",
                                                                                    subStatusColor
                                                                                )}>
                                                                                    {ipo.status === 'open' ? `${ipo.daysRemaining} days left` : ipo.status}
                                                                                </div>
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground/30 hover:text-primary hover:bg-primary/5">
                                                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }) : (
                                                <div className="p-6 text-center text-muted-foreground text-sm font-medium">
                                                    No IPOs found for this filter.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="border-dashed border-muted-foreground/20 bg-muted/5 flex items-center justify-center py-20">
                                    <CardContent className="flex flex-col items-center gap-3 opacity-40 text-center">
                                        <Activity className="w-10 h-10" />
                                        <span className="text-xs font-black uppercase tracking-widest text-center">No active IPOs found</span>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="bg-card/40 backdrop-blur-sm border-muted/50 flex flex-col text-left">
                                <CardHeader>
                                    <CardTitle className="text-lg font-black">Market Sentiment</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Snapshot of current IPO pipeline</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-center items-center py-10">
                                    <div className="w-24 h-24 rounded-full border-8 border-primary/20 flex items-center justify-center mb-6">
                                        <div className="w-16 h-16 rounded-full border-4 border-primary animate-pulse flex items-center justify-center">
                                            <TrendingUp className="w-8 h-8 text-primary" />
                                        </div>
                                    </div>
                                    <h4 className={cn("text-xl font-black mb-2", sentiment.toneClass)}>{sentiment.label}</h4>
                                    <p className="text-xs text-muted-foreground text-center max-w-[240px] font-medium leading-relaxed italic">
                                        {sentiment.description}
                                    </p>
                                </CardContent>
                                <div className="p-4 bg-muted/10 border-t border-muted/20 flex justify-center">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Source: Upcoming IPO Feed</Badge>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div >
            </>
        )
    }

    return (
        <div className="space-y-6">
            <CreatePortfolioModal
                open={isCreatePortfolioOpen}
                onOpenChange={setIsCreatePortfolioOpen}
                newPortfolio={newPortfolio}
                setNewPortfolio={setNewPortfolio}
                onCreate={handleCreatePortfolio}
            />

            <EditPortfolioModal
                open={isEditPortfolioOpen}
                onOpenChange={setIsEditPortfolioOpen}
                portfolio={editingPortfolio}
                onSave={handleSavePortfolio}
            />

            {/* Header section */}
            <div className="flex flex-col gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit text-xs font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 mb-2 transition-all flex items-center gap-1.5"
                    onClick={() => setViewMode("overview")}
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to Portfolios
                </Button>
                <div className="flex flex-row items-center justify-between gap-4">
                    <div className="text-left min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Portfolio</h2>
                            <Select value={activePortfolioId || ""} onValueChange={switchPortfolio}>
                                <SelectTrigger className="hidden sm:flex w-[140px] sm:w-[180px] h-8 sm:h-9 rounded-xl border-primary/20 bg-card/50 backdrop-blur-sm font-bold shadow-sm text-sm">
                                    <SelectValue placeholder="Select Portfolio" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-primary/10">
                                    {portfolios.map((p: Portfolio) => (
                                        <SelectItem key={p.id} value={p.id} className="font-medium rounded-lg">
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-xs font-bold text-primary hover:bg-primary/5 mt-1 border-t rounded-none py-4"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsCreatePortfolioOpen(true);
                                        }}
                                    >
                                        <Plus className="w-3 h-3 mr-2" /> Create New
                                    </Button>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium hidden sm:block">Track and analyze your share market investments</p>
                    </div>
                    <div className="flex gap-2 w-auto">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-9 w-9 sm:h-10 sm:w-auto sm:px-4 rounded-xl border-primary/20 hover:border-primary/40 bg-card/50 backdrop-blur-sm shadow-sm shrink-0"
                        >
                            <RefreshCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                            <span className="hidden sm:inline ml-2">Refresh</span>
                        </Button>
                        <AddTransactionModal
                            open={isAddDialogOpen}
                            onOpenChange={setIsAddDialogOpen}
                            newTx={newTx}
                            setNewTx={setNewTx}
                            onAdd={handleAddTransaction}
                            stockOptions={stockOptions}
                            portfolioStockOptions={portfolioStockOptions}
                            portfolioCryptoOptions={portfolioCryptoOptions}
                            currencySymbol={currencySymbol}
                        />
                    </div>
                </div>
            </div>

            {/* Stock Detail Modal */}
            <StockDetailModal
                item={selectedStock}
                open={isStockDetailOpen}
                onOpenChange={setIsStockDetailOpen}
                mode={selectedStockDetailMode}
            />

            {/* Sell Confirmation Modal */}
            <SellConfirmationModal
                symbol={sellConfirmModal.symbol}
                assetType={sellConfirmModal.assetType}
                cryptoId={sellConfirmModal.cryptoId}
                portfolioId={sellConfirmModal.portfolioId}
                open={sellConfirmModal.open}
                onOpenChange={(open) => setSellConfirmModal(prev => ({ ...prev, open }))}
                onConfirmKeep={handleSellConfirmKeep}
                onConfirmRemove={handleSellConfirmRemove}
                onDisableZeroHoldings={handleDisableZeroHoldings}
                shareTransactions={shareTransactions}
                zeroHoldingsEnabled={zeroHoldingsEnabled}
            />

            {/* IPO Detail Modal */}
            <IPODetailModal
                ipo={selectedIPO}
                open={isIPODetailOpen}
                onOpenChange={setIsIPODetailOpen}
            />

            <ConfirmationModal
                open={confirmModal.open}
                onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
                title={confirmModal.title}
                description={confirmModal.description}
                onConfirm={() => confirmModal.onConfirm?.()}
                confirmText={confirmModal.confirmText}
                destructive={confirmModal.destructive}
            />
            {renderInvestmentBreakdownModal()}

            {/* Import Price Modal */}
            <ImportVerificationModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                importQueue={importQueue}
                importPrices={importPrices}
                setImportPrices={setImportPrices}
                importTransactionPrices={importTransactionPrices}
                setImportTransactionPrices={setImportTransactionPrices}
                onConfirm={handleConfirmImport}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Summary Cards Column */}
                <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-2 px-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0">
                    <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20 shadow-md overflow-hidden relative group transition-all duration-300 hover:shadow-primary/10 min-w-[110px] sm:min-w-[120px] flex-1 lg:min-w-0 lg:p-2">
                        <CardHeader className="pb-1 px-2 sm:px-4 pt-2 sm:pt-4">
                            <div className="flex items-center justify-between mb-0.5">
                                <CardDescription className="text-foreground/60 font-bold text-[8px] sm:text-[9px] uppercase tracking-widest">
                                    {showSoldStocks ? "Total Sold" : "Net Worth"}
                                </CardDescription>
                                <div className="p-0.5 bg-primary/10 rounded-lg text-primary">
                                    {showSoldStocks ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                </div>
                            </div>
                            <CardTitle className="text-sm sm:text-lg lg:text-base font-black tracking-tight font-mono">
                                {currencySymbol}{(showSoldStocks ? soldPortfolioStats.totalSoldValue : currentValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-2 sm:pb-4">
                            {showSoldStocks ? (
                                <div className="flex flex-wrap gap-1">
                                    <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-tight bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                        {formatUnits(soldPortfolioStats.totalSoldUnits)} Units Sold
                                    </div>
                                    <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-tight bg-success/10 text-success border border-success/20">
                                        {currencySymbol}{soldPortfolioStats.reinvestedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} Reinvested
                                    </div>
                                </div>
                            ) : (
                                <div className={cn(
                                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-tight",
                                    totalProfitLoss >= 0 ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"
                                )}>
                                    {totalProfitLoss >= 0 ? "+" : ""}{totalProfitLoss.toLocaleString()} ({totalProfitLossPercentage.toFixed(1)}%)
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-muted/50 bg-card/40 backdrop-blur-sm shadow-sm border hover:border-primary/10 transition-colors min-w-[100px] sm:min-w-[110px] flex-1 lg:min-w-0 lg:p-2">
                        <CardHeader className="pb-1 space-y-0 text-left px-2 sm:px-4 pt-2 sm:pt-4">
                            <CardDescription className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">
                                {showSoldStocks ? "Today Value" : "Today's Move"}
                            </CardDescription>
                            <CardTitle className="text-sm sm:text-lg lg:text-base font-black font-mono flex items-center gap-1">
                                <span className={showSoldStocks || todayChange >= 0 ? "text-success" : "text-error"}>
                                    {showSoldStocks
                                        ? `${currencySymbol}${soldPortfolioStats.totalSoldTodayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                        : `${todayChange >= 0 ? "+" : ""}${todayChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-2 sm:pb-4">
                            <div className="flex items-center gap-1">
                                {showSoldStocks ? (
                                    <div className={cn(
                                        "text-[8px] sm:text-[9px] font-black px-1 py-0.5 rounded border",
                                        soldPortfolioStats.soldValueDifference >= 0
                                            ? "text-error bg-error/10 border-error/20"
                                            : "text-success bg-success/10 border-success/20"
                                    )}>
                                        {soldPortfolioStats.soldValueDifference >= 0 ? "+" : ""}
                                        {currencySymbol}{soldPortfolioStats.soldValueDifference.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        {" "}({soldPortfolioStats.soldValueDifferencePercentage >= 0 ? "+" : ""}
                                        {soldPortfolioStats.soldValueDifferencePercentage.toFixed(1)}%)
                                    </div>
                                ) : todayChange >= 0 ? (
                                    <div className="text-[8px] sm:text-[9px] font-black text-success bg-success/10 px-1 py-0.5 rounded border border-success/20">
                                        +{todayChangePercentage.toFixed(1)}%
                                    </div>
                                ) : (
                                    <div className="text-[8px] sm:text-[9px] font-black text-error bg-error/10 px-1 py-0.5 rounded border border-error/20">
                                        {todayChangePercentage.toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className={cn(
                            "border-muted/50 bg-card/40 backdrop-blur-sm shadow-sm border hover:border-primary/10 transition-colors min-w-[100px] sm:min-w-[110px] flex-1 lg:min-w-0 lg:p-2",
                            !showSoldStocks && "cursor-pointer"
                        )}
                        onClick={() => {
                            if (!showSoldStocks) openInvestmentBreakdown("Portfolio Investment Breakdown", activePortfolioId)
                        }}
                    >
                        <CardHeader className="pb-1 text-left px-2 sm:px-4 pt-2 sm:pt-4">
                            <CardDescription className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">
                                {showSoldStocks ? "Sold Spread" : "Total Stake"}
                            </CardDescription>
                            <CardTitle className="text-sm sm:text-lg lg:text-base font-black font-mono">
                                {showSoldStocks
                                    ? `${soldPortfolioStats.soldScrips} Scrips`
                                    : `${currencySymbol}${totalInvestment.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-2 sm:pb-4">
                            {showSoldStocks ? (
                                <Badge variant="outline" className="text-[8px] sm:text-[9px] rounded font-black px-1 uppercase tracking-wide">
                                    {soldPortfolioStats.soldSectors} Sectors
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] sm:text-[9px] rounded border-primary/20 font-black px-1 uppercase tracking-wide">
                                    {portfolio.length} Scrips
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sector/Stock Distribution Chart */}
                <Card className={cn(
                    "lg:col-span-3 border-muted/50 shadow-xl overflow-hidden relative bg-card/20 backdrop-blur-sm border-2 border-primary/5 transition-all",
                    !isChartExpanded && "lg:block"
                )}>
                    <CardHeader className="pb-0 px-4 sm:px-6">
                        <div className="flex items-center justify-between font-black">
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                                    {chartMode === "allocation" ? (
                                        <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                    ) : (
                                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                    )}
                                    <span className="truncate">
                                        {showSoldStocks
                                            ? (chartMode === "allocation"
                                                ? (chartView === "sector" ? "Sold by Sector" : "Sold by Stock")
                                                : "Sold Comparison")
                                            : chartMode === "allocation"
                                            ? (chartView === "sector" ? "Sector Allocation" : "Stock Allocation")
                                            : "Top Movers"}
                                    </span>
                                </CardTitle>
                                <CardDescription className="text-xs font-medium hidden sm:block">
                                    {showSoldStocks
                                        ? (chartMode === "allocation" ? (chartView === "sector"
                                            ? "Sold value grouped by industry sector"
                                            : "Sold value grouped by individual scrip")
                                            : "Current value compared with your sold value")
                                        : chartMode === "allocation"
                                        ? (chartView === "sector"
                                            ? "Portfolio distribution by industry sector"
                                            : "Portfolio weighting by individual scrip")
                                        : "Best and worst performers in your portfolio today"}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                                {/* Mobile toggle button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="lg:hidden h-8 w-8 p-0 rounded-lg"
                                    onClick={() => setIsChartExpanded(!isChartExpanded)}
                                    title={isChartExpanded ? "Collapse Chart" : "Expand Chart"}
                                >
                                    {isChartExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                                <div className="flex items-center gap-1 sm:gap-2 bg-muted/30 p-1 rounded-xl border border-muted/50">
                                    <Button
                                        variant={chartMode === "allocation" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn("h-6 sm:h-7 px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg transition-all", chartMode === "allocation" && "bg-background shadow-sm")}
                                        onClick={() => setChartMode("allocation")}
                                    >
                                        Allocation
                                    </Button>
                                    <Button
                                        variant={chartMode === "movers" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn("h-6 sm:h-7 px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg transition-all", chartMode === "movers" && "bg-background shadow-sm")}
                                        onClick={() => setChartMode("movers")}
                                    >
                                        {showSoldStocks ? "Compare" : "Movers"}
                                    </Button>
                                </div>
                                {chartMode === "allocation" && (
                                    <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                                        <div className="bg-muted/30 p-1 rounded-xl border border-muted/50">
                                            <Select
                                                value={chartView}
                                                onValueChange={(value) => setChartView(value as "sector" | "scrip")}
                                            >
                                                <SelectTrigger className="h-6 sm:h-7 min-w-[120px] px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg border-0 bg-background shadow-sm focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="View" />
                                                </SelectTrigger>
                                                <SelectContent className="text-[10px] font-bold uppercase tracking-wider">
                                                    <SelectItem value="sector">Sectors</SelectItem>
                                                    <SelectItem value="scrip">Stocks</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="bg-muted/30 p-1 rounded-xl border border-muted/50">
                                            <Select
                                                value={chartMetric}
                                                onValueChange={(value) => setChartMetric(value as "value" | "units")}
                                            >
                                                <SelectTrigger className="h-6 sm:h-7 min-w-[110px] px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg border-0 bg-background shadow-sm focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="Metric" />
                                                </SelectTrigger>
                                                <SelectContent className="text-[10px] font-bold uppercase tracking-wider">
                                                    <SelectItem value="value">Value</SelectItem>
                                                    <SelectItem value="units">Units</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className={cn(
                        "p-0 relative transition-all duration-300 overflow-hidden",
                        "h-0 lg:h-[280px] xl:h-[320px]",
                        isChartExpanded && "h-[250px] sm:h-[280px]"
                    )}>
                        {/* Mobile show chart hint when collapsed */}
                        <div className={cn(
                            "lg:hidden absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm transition-opacity cursor-pointer",
                            isChartExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
                        )} onClick={() => setIsChartExpanded(true)}>
                            {chartMode === "allocation" ? (
                                <PieChartIcon className="w-8 h-8 text-primary/40 mb-2" />
                            ) : (
                                <TrendingUp className="w-8 h-8 text-primary/40 mb-2" />
                            )}
                            <span className="text-xs font-bold text-muted-foreground">
                                Tap to view {chartMode === "allocation" ? "chart" : showSoldStocks ? "comparison" : "movers"}
                            </span>
                        </div>
                        {(chartMode === "allocation" ? activeChartData.length > 0 : (showSoldStocks ? soldPortfolioStats.missedUpside.length > 0 || soldPortfolioStats.savedDownside.length > 0 || soldPortfolioStats.flat.length > 0 : activePortfolioItems.length > 0)) ? (
                            chartMode === "allocation" ? (
                                <div className="flex h-full items-center justify-center relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={activeChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={75}
                                                outerRadius={105}
                                                paddingAngle={4}
                                                dataKey={chartMetric}
                                                stroke="none"
                                                animationBegin={0}
                                                animationDuration={1000}
                                            >
                                                {activeChartData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${chartView}-${index}`}
                                                        fill={entry.color}
                                                        className="hover:opacity-80 transition-opacity cursor-pointer shadow-xl"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-card/95 backdrop-blur-md border border-primary/10 p-3 rounded-2xl shadow-2xl">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].color }} />
                                                                    <span className="font-black text-sm">{data.name}</span>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <div className="flex justify-between gap-8">
                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Allocation</span>
                                                                        <span className="text-[10px] font-black text-right">{data.percentage.toFixed(2)}%</span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-8">
                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                                            {chartMetric === "units" ? "Units" : "Value"}
                                                                        </span>
                                                                        <span className="text-[10px] font-black text-right">
                                                                            {chartMetric === "units"
                                                                                ? formatUnits(data.units || 0)
                                                                                : `रु${data.value.toLocaleString()}`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-8">
                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                                            {chartMetric === "units" ? "Value" : "Units"}
                                                                        </span>
                                                                        <span className="text-[10px] font-black text-right">
                                                                            {chartMetric === "units"
                                                                                ? `रु${data.value.toLocaleString()}`
                                                                                : formatUnits(data.units || 0)}
                                                                        </span>
                                                                    </div>
                                                                    {chartView === "sector" && (
                                                                        <div className="flex justify-between gap-8">
                                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Holdings</span>
                                                                            <span className="text-[10px] font-black text-right">{data.count} Scrips</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="middle"
                                                align="right"
                                                layout="vertical"
                                                iconType="circle"
                                                iconSize={8}
                                                wrapperStyle={{ paddingRight: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                                formatter={(value, entry: any) => {
                                                    const payload = entry.payload;
                                                    return (
                                                        <span className="text-foreground/80 hover:text-foreground transition-colors inline-flex items-center justify-between w-32 border-b border-muted/20 pb-1 mb-1">
                                                            <span className="truncate max-w-[80px]">{value}</span>
                                                            <span className="text-primary/60">{Math.round(payload.percentage)}%</span>
                                                        </span>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : showSoldStocks ? (
                                <div className={cn(
                                    "h-full w-full p-4 sm:p-6 grid gap-4 min-h-0",
                                    soldPortfolioStats.flat.length > 0 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-2",
                                )}>
                                    {soldPortfolioStats.missedUpside.length > 0 && (
                                        <div className="flex flex-col gap-2 min-h-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-error">Missed Upside</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-error bg-error/10 border border-error/20 px-1.5 py-0.5 rounded-md">
                                                        +{currencySymbol}{soldPortfolioStats.missedUpsideTotal.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <TrendingUp className="w-3.5 h-3.5 text-error" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                                                <span>{formatUnits(soldPortfolioStats.missedUpsideTotal.units)} units</span>
                                                <span>Today {currencySymbol}{soldPortfolioStats.missedUpsideTotal.todayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
                                                {soldPortfolioStats.missedUpside.map((row) => (
                                                    <div
                                                        key={row.symbol}
                                                        className="w-full text-left flex items-center justify-between rounded-xl border border-muted/30 bg-muted/5 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black uppercase">{row.symbol}</p>
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold">
                                                                    {formatUnits(row.units)} sold
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground truncate">{row.sector}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black text-error">
                                                                +{row.differencePercentage.toFixed(2)}%
                                                            </p>
                                                            <p className="text-[9px] text-error">+{currencySymbol}{row.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {soldPortfolioStats.savedDownside.length > 0 && (
                                        <div className="flex flex-col gap-2 min-h-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-success">Saved Downside</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded-md">
                                                        {currencySymbol}{soldPortfolioStats.savedDownsideTotal.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <TrendingDown className="w-3.5 h-3.5 text-success" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                                                <span>{formatUnits(soldPortfolioStats.savedDownsideTotal.units)} units</span>
                                                <span>Today {currencySymbol}{soldPortfolioStats.savedDownsideTotal.todayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
                                                {soldPortfolioStats.savedDownside.map((row) => (
                                                    <div
                                                        key={row.symbol}
                                                        className="w-full text-left flex items-center justify-between rounded-xl border border-muted/30 bg-muted/5 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black uppercase">{row.symbol}</p>
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold">
                                                                    {formatUnits(row.units)} sold
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground truncate">{row.sector}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black text-success">
                                                                {row.differencePercentage.toFixed(2)}%
                                                            </p>
                                                            <p className="text-[9px] text-success">{currencySymbol}{row.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {soldPortfolioStats.flat.length > 0 && (
                                        <div className="flex flex-col gap-2 min-h-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Flat Since Sold</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-muted-foreground bg-muted/40 border border-muted px-1.5 py-0.5 rounded-md">
                                                        {currencySymbol}{soldPortfolioStats.flatTotal.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                                                <span>{formatUnits(soldPortfolioStats.flatTotal.units)} units</span>
                                                <span>Today {currencySymbol}{soldPortfolioStats.flatTotal.todayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
                                                {soldPortfolioStats.flat.map((row) => (
                                                    <div
                                                        key={row.symbol}
                                                        className="w-full text-left flex items-center justify-between rounded-xl border border-muted/30 bg-muted/5 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black uppercase">{row.symbol}</p>
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold">
                                                                    {formatUnits(row.units)} sold
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground truncate">{row.sector}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black text-muted-foreground">
                                                                {row.differencePercentage.toFixed(2)}%
                                                            </p>
                                                            <p className="text-[9px] text-muted-foreground">{currencySymbol}{row.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : hasMoverData || hasNoMoverData ? (
                                <div className={cn(
                                    "h-full w-full p-4 sm:p-6 grid gap-4 min-h-0",
                                    hasNoMoverData ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-2",
                                )}>
                                    {portfolioMovers.gainers.length > 0 && (
                                        <div className="flex flex-col gap-2 min-h-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-success">Top Movers</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded-md">
                                                        +{portfolioMovers.topMoversProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                                                </div>
                                            </div>
                                            <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
                                                {portfolioMovers.gainers.map((row) => (
                                                    <div
                                                        key={row.id}
                                                        className="w-full text-left flex items-center justify-between rounded-xl border border-muted/30 bg-muted/5 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black uppercase">{row.symbol}</p>
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold">
                                                                    {formatUnits(row.units)} units
                                                                </Badge>
                                                            </div>
                                                            {row.name ? (
                                                                <p className="text-[9px] text-muted-foreground truncate">{row.name}</p>
                                                            ) : null}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black text-success">
                                                                +{row.percentChange.toFixed(2)}%
                                                            </p>
                                                            <p className="text-[9px] text-success">+{row.valueChange.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {portfolioMovers.losers.length > 0 && (
                                        <div className="flex flex-col gap-2 min-h-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-error">Top Losers</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-error bg-error/10 border border-error/20 px-1.5 py-0.5 rounded-md">
                                                        -{portfolioMovers.topLosersLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                    <TrendingDown className="w-3.5 h-3.5 text-error" />
                                                </div>
                                            </div>
                                            <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
                                                {portfolioMovers.losers.map((row) => (
                                                    <div
                                                        key={row.id}
                                                        className="w-full text-left flex items-center justify-between rounded-xl border border-muted/30 bg-muted/5 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black uppercase">{row.symbol}</p>
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold">
                                                                    {formatUnits(row.units)} units
                                                                </Badge>
                                                            </div>
                                                            {row.name ? (
                                                                <p className="text-[9px] text-muted-foreground truncate">{row.name}</p>
                                                            ) : null}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black text-error">
                                                                {row.percentChange.toFixed(2)}%
                                                            </p>
                                                            <p className="text-[9px] text-error">{row.valueChange.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {portfolioMovers.noMovers.length > 0 && (
                                        <div className="flex flex-col gap-2 min-h-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No Movers</span>
                                                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
                                                {portfolioMovers.noMovers.map((row) => (
                                                    <div
                                                        key={row.id}
                                                        className="w-full text-left flex items-center justify-between rounded-xl border border-muted/30 bg-muted/5 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black uppercase">{row.symbol}</p>
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] font-bold">
                                                                    {formatUnits(row.units)} units
                                                                </Badge>
                                                            </div>
                                                            {row.name ? (
                                                                <p className="text-[9px] text-muted-foreground truncate">{row.name}</p>
                                                            ) : null}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[11px] font-black text-muted-foreground">
                                                                {row.percentChange.toFixed(2)}%
                                                            </p>
                                                            <p className="text-[9px] text-muted-foreground">{row.valueChange.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                null
                            )

                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-6 text-center">
                                <PieChartIcon className="w-12 h-12 mb-4 opacity-10" />
                                <p className="text-xs font-bold uppercase tracking-widest opacity-40">
                                    {showSoldStocks ? "Sell transactions will appear here by sector" : "Add holdings to see distribution data"}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="holdings" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                    aria-label="Import portfolio data"
                />
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center bg-card/60 p-2 rounded-2xl border border-border/50 mb-4 sm:mb-6 shadow-sm backdrop-blur-md">
                    <TabsList className="bg-muted/50 rounded-xl h-10 p-1 w-full sm:w-auto">
                        <TabsTrigger value="holdings" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 flex-1 sm:flex-none justify-center">
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Active Stocks</span>
                            <span className="sm:hidden">Stocks</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 sm:px-4 flex-1 sm:flex-none justify-center text-left">
                            <History className="w-4 h-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input
                                placeholder="Filter stocks..."
                                className="pl-9 h-10 bg-background/80 border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium text-left"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant={showSoldStocks ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-10 px-3 rounded-xl font-bold transition-all",
                                showSoldStocks ? "bg-primary/10 text-primary border-primary/20" : "border-muted/50"
                            )}
                            onClick={() => setShowSoldStocks(!showSoldStocks)}
                        >
                            {showSoldStocks ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                            <span className="hidden sm:inline">Sold Stocks</span>
                        </Button>
                        <div className="hidden sm:flex items-center bg-background/50 border border-muted/50 rounded-xl px-2 h-10 gap-1 shadow-inner">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-primary bg-primary/10 shadow-sm border border-primary/10"
                                onClick={() => setHoldingsView((view) => view === "list" ? "grid" : "list")}
                                title={holdingsView === "list" ? "Switch to grid view" : "Switch to list view"}
                                aria-label={holdingsView === "list" ? "Switch to grid view" : "Switch to list view"}
                            >
                                {holdingsView === "list" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>

                <TabsContent value="holdings" className="mt-0">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    {showSoldStocks ? "Sold Holdings" : "My Holdings"}
                                    <Badge variant="secondary" className="rounded-full font-black">
                                        {showSoldStocks ? soldPortfolioRows.length : activePortfolioItemsForCalculations.length}
                                    </Badge>
                                    {showSoldStocks && (
                                        <TooltipProvider>
                                            <UITooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
                                                        aria-label="How to read sold holdings"
                                                    >
                                                        <Info className="h-3.5 w-3.5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-xs text-xs">
                                                    <div className="space-y-1">
                                                        <p><strong>Sold Holdings</strong> are grouped from sell transactions, not active units.</p>
                                                        <p><strong>Missed Upside</strong>: sold units are worth more today.</p>
                                                        <p><strong>Saved Downside</strong>: sold units are worth less today.</p>
                                                        <p><strong>Trading value</strong>: sold units multiplied by current price.</p>
                                                    </div>
                                                </TooltipContent>
                                            </UITooltip>
                                        </TooltipProvider>
                                    )}
                                    {!showSoldStocks && <div className="flex gap-1 ml-1">
                                        <Badge className="bg-success/10 text-success border-success/20 text-[9px] font-black py-0 px-1.5 h-4">
                                            {activePortfolioItemsForCalculations.filter(p => (p.currentPrice || p.buyPrice) > p.buyPrice).length}↑
                                        </Badge>
                                        <Badge className="bg-error/10 text-error border-error/20 text-[9px] font-black py-0 px-1.5 h-4">
                                            {activePortfolioItemsForCalculations.filter(p => (p.currentPrice || p.buyPrice) < p.buyPrice).length}↓
                                        </Badge>
                                    </div>}
                                </h3>
                                {activePortfolioItemsForCalculations.length > 0 && activePortfolioItemsForCalculations[0]?.lastUpdated && (
                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                        <RefreshCcw className="w-2.5 h-2.5" />
                                        Synced {new Date(activePortfolioItemsForCalculations.reduce((latest, item) => {
                                            const itemDate = new Date(item.lastUpdated || 0).getTime();
                                            return itemDate > latest ? itemDate : latest;
                                        }, 0)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 text-left">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 font-medium bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                                    onClick={triggerFileUpload}
                                    title="Import Data"
                                >
                                    <Upload className="w-3.5 h-3.5 sm:mr-2" />
                                    <span className="hidden sm:inline">Import Data</span>
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="h-[500px] rounded-2xl border bg-card/50 backdrop-blur-sm shadow-inner">
                            <div
                                className={cn(
                                    "p-4 text-left",
                                    holdingsView === "grid"
                                        ? "grid grid-cols-1 xl:grid-cols-2 gap-3"
                                        : "space-y-3"
                                )}
                            >
                                {!showSoldStocks && portfolio.length === 0 && activePortfolioId ? (
                                    // Loading skeleton state
                                    <div className="space-y-3">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-muted/20 bg-card/30">
                                                <Skeleton className="h-10 w-10 rounded-lg" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-24" />
                                                    <Skeleton className="h-3 w-16" />
                                                </div>
                                                <div className="text-right space-y-2">
                                                    <Skeleton className="h-4 w-20" />
                                                    <Skeleton className="h-3 w-12" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (showSoldStocks ? soldPortfolioRows.length === 0 : filteredPortfolio.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4 ring-8 ring-muted/20">
                                            <TrendingUp className="w-10 h-10 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-xl font-bold">
                                            {showSoldStocks ? "No sold stocks" : "No active holdings"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-[300px] mt-2">
                                            {showSoldStocks
                                                ? "Sell transactions will appear here after you record or import them."
                                                : "Start by adding transactions or upload your Mero Share CSV to see your portfolio in action."}
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                            <Button
                                                variant="default"
                                                className="font-bold shadow-lg"
                                                onClick={() => setIsAddDialogOpen(true)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                New Transaction
                                            </Button>
                                            <Button variant="default" className="font-bold shadow-lg bg-primary/90" onClick={triggerFileUpload}>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Import My Data
                                            </Button>
                                            <Button variant="outline" className="border-dashed" onClick={() => handleImportDemo('My Shares Values.csv')}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Try Demo
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    (showSoldStocks ? soldPortfolioRows.map((row) => row.item) : filteredPortfolio).map((item) => {
                                        const isCrypto = item.assetType === "crypto" || Boolean(item.cryptoId)
                                        const safeBuyPrice = Number.isFinite(item.buyPrice) ? item.buyPrice : 0
                                        const current = Number.isFinite(item.currentPrice) ? item.currentPrice! : safeBuyPrice
                                        const isZeroHolding = item.units === 0 || item.isKeptZeroHolding
                                        const investment = item.units * safeBuyPrice
                                        const value = item.units * current
                                        const profitLoss = value - investment
                                        const previousClose = isFiniteNumber(item.previousClose) ? item.previousClose : null
                                        const hasFreshMoveToday = hasFreshDailyQuote(item)
                                        const dailyChangeRaw = isFiniteNumber(item.change)
                                            ? item.change
                                            : (isFiniteNumber(item.currentPrice) && previousClose !== null ? item.currentPrice - previousClose : 0)
                                        const dailyChangePercRaw = isFiniteNumber(item.percentChange)
                                            ? item.percentChange
                                            : (previousClose !== null && previousClose !== 0 ? (dailyChangeRaw / previousClose) * 100 : 0)
                                        const dailyChange = hasFreshMoveToday ? dailyChangeRaw : 0
                                        const dailyChangePerc = hasFreshMoveToday ? dailyChangePercRaw : 0
                                        const showDailyChange = !isZeroHolding && hasFreshMoveToday && (previousClose !== null || isFiniteNumber(item.change) || isFiniteNumber(item.percentChange))
                                        const isDailyNeutral = dailyChange === 0 && dailyChangePerc === 0
                                        const isDailyProfit = dailyChange > 0
                                        const isSoldViewRow = showSoldStocks

                                        const soldRow = showSoldStocks ? soldPortfolioRowsByItemId.get(item.id) : undefined
                                        const relevantTxs = shareTransactions.filter(
                                            (tx) =>
                                                tx.portfolioId === item.portfolioId &&
                                                normalizeStockSymbol(tx.symbol) === normalizeStockSymbol(item.symbol) &&
                                                tx.assetType === (item.assetType || "stock") &&
                                                (tx.cryptoId || "") === (item.cryptoId || "")
                                        )
                                        const sellTxs = soldRow?.sellTxs || relevantTxs.filter((tx) => tx.type === "sell")
                                        const soldQuantity = soldRow?.soldQuantity ?? sellTxs.reduce((sum, tx) => sum + safeNumber(tx.quantity), 0)
                                        const soldValue = soldRow?.soldValue ?? sellTxs.reduce((sum, tx) => sum + safeNumber(tx.quantity) * safeNumber(tx.price), 0)
                                        const soldTodayValue = soldQuantity * current
                                        const soldDifference = soldTodayValue - soldValue
                                        const averageSoldPrice = soldQuantity > 0 ? soldValue / soldQuantity : 0
                                        const hasSoldPrice = averageSoldPrice > 0
                                        const latestSellInfo = soldRow?.latestSell || [...sellTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                                        const lastExitInfo = (isZeroHolding || showSoldStocks) ? (() => {
                                            const exitTxs = relevantTxs
                                                .filter((tx) => tx.type === "sell" || tx.type === "merger_out")
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            return exitTxs[0]
                                        })() : null
                                        const isSold = lastExitInfo?.type === "sell"
                                        const isMerged = lastExitInfo?.type === "merger_out"

                                        return (
                                            <div
                                                key={item.id}
                                                className="flex flex-col rounded-2xl border bg-background hover:bg-muted/10 transition-all duration-300 group overflow-hidden hover:shadow-xl hover:border-primary/20"
                                            >
                                                <div
                                                    className="flex items-center justify-between p-3 sm:p-4 cursor-pointer gap-2 sm:gap-4"
                                                    onClick={() => handleViewStockDetail(item)}
                                                >
                                                    <div className="flex gap-3 sm:gap-4 items-center min-w-0 flex-1">
                                                        <div className={cn(
                                                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm sm:text-lg shadow-sm border shrink-0 transition-transform group-hover:scale-105",
                                                            isSoldViewRow
                                                                ? "bg-amber-500/5 text-amber-600 border-amber-500/20"
                                                                : isZeroHolding
                                                                ? "bg-muted/30 text-muted-foreground border-muted/40"
                                                                : isDailyNeutral
                                                                    ? "bg-muted/40 text-muted-foreground border-muted/30"
                                                                    : isDailyProfit
                                                                        ? "bg-success/5 text-success border-success/10"
                                                                        : "bg-error/5 text-error border-error/10"
                                                        )}>
                                                            {item.symbol.substring(0, 2)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                                <h4 className="font-extrabold text-sm sm:text-base tracking-tight">{item.symbol}</h4>
                                                                {showSoldStocks && latestSellInfo ? (
                                                                    <Badge variant="outline" className="hidden sm:inline-flex text-[9px] h-4 px-1.5 bg-muted/40 font-bold border-muted-foreground/20 uppercase tracking-widest text-muted-foreground">
                                                                        {formatTimeSince(latestSellInfo.date)}
                                                                    </Badge>
                                                                ) : null}
                                                                {!showSoldStocks && isZeroHolding ? (
                                                                    isSold ? (
                                                                        <Badge variant="outline" className="hidden sm:inline-flex text-[9px] h-4 px-1.5 bg-amber-500/10 font-bold border-amber-500/30 uppercase tracking-widest text-amber-600">
                                                                            SOLD
                                                                        </Badge>
                                                                    ) : isMerged ? (
                                                                        <Badge variant="outline" className="hidden sm:inline-flex text-[9px] h-4 px-1.5 bg-purple-500/10 font-bold border-purple-500/30 uppercase tracking-widest text-purple-600">
                                                                            MERGED
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="hidden sm:inline-flex text-[9px] h-4 px-1.5 bg-muted/50 font-bold border-muted-foreground/20 uppercase tracking-widest text-muted-foreground/80">
                                                                            {item.sector || "Others"}
                                                                        </Badge>
                                                                    )
                                                                ) : !showSoldStocks ? (
                                                                    <Badge variant="outline" className="hidden sm:inline-flex text-[9px] h-4 px-1.5 bg-muted/50 font-bold border-muted-foreground/20 uppercase tracking-widest text-muted-foreground/80">
                                                                        {item.sector || "Others"}
                                                                    </Badge>
                                                                ) : null}
                                                                <Info className="hidden sm:block w-3 h-3 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                                                                {showSoldStocks && latestSellInfo ? (
                                                                    <>
                                                                        <span className="text-[10px] font-black uppercase tracking-tighter text-amber-600/80">
                                                                            Sold {formatUnits(soldQuantity)} units
                                                                        </span>                                                                        {hasSoldPrice ? (
                                                                            <>
                                                                                <span className="hidden sm:inline text-[10px] opacity-20">•</span>
                                                                                <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                                                                                    Avg {isCrypto ? "$" : "रु"} {formatHoldingAmount(averageSoldPrice, isCrypto)}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span className="hidden sm:inline text-[10px] opacity-20">•</span>
                                                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md border border-muted">
                                                                                    Sell price not recorded
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                ) : isZeroHolding ? (
                                                                    <span className={cn(
                                                                        "text-[10px] font-black uppercase tracking-tighter",
                                                                        isSold ? "text-amber-600/80" : isMerged ? "text-purple-600/80" : "text-muted-foreground"
                                                                    )}>
                                                                        {isSold && lastExitInfo
                                                                            ? `Sold @ ${isCrypto ? "$" : "रु"}${lastExitInfo.price}`
                                                                            : isMerged && lastExitInfo
                                                                                ? `Merged Out`
                                                                                : "Zero Units"}
                                                                    </span>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">{formatUnits(item.units)} Units</span>
                                                                        <span className="hidden sm:inline text-[10px] opacity-20">•</span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                                                                                {isCrypto ? "$" : "रु"} {formatHoldingAmount(current, isCrypto)}
                                                                            </span>
                                                                            {showDailyChange && (
                                                                                <span
                                                                                    className={cn(
                                                                                        "hidden sm:inline-flex text-[9px] font-black px-1.5 py-0.5 rounded-md items-center gap-0.5",
                                                                                        isDailyNeutral
                                                                                            ? "bg-muted text-muted-foreground"
                                                                                            : isDailyProfit
                                                                                                ? "bg-success/10 text-success"
                                                                                                : "bg-error/10 text-error"
                                                                                    )}
                                                                                >
                                                                                    {isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(1)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                                        <div className="text-right flex flex-col items-end">
                                                            {showSoldStocks && latestSellInfo ? (
                                                                <>
                                                                    <div className="font-black text-sm sm:text-lg tracking-tighter font-mono leading-tight">
                                                                        {formatUnits(soldQuantity)} Units
                                                                    </div>
                                                                    <div className={cn(
                                                                        "text-[9px] sm:text-[10px] flex items-center gap-1 font-black",
                                                                        hasSoldPrice
                                                                            ? (soldDifference > 0 ? "text-error" : soldDifference < 0 ? "text-success" : "text-muted-foreground")
                                                                            : "text-primary"
                                                                    )}>
                                                                        <span className="hidden sm:inline">
                                                                            Trading value
                                                                        </span>
                                                                        <span>{isCrypto ? "$" : "रु"}{formatHoldingAmount(soldTodayValue, isCrypto)}</span>
                                                                    </div>
                                                                    {hasSoldPrice && (
                                                                        <div className="text-[9px] sm:text-[10px] font-black text-muted-foreground/60">
                                                                            Sold value {isCrypto ? "$" : "रु"}{formatHoldingAmount(soldValue, isCrypto)}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : isZeroHolding ? (
                                                                <>
                                                                    <div className="font-black text-sm sm:text-lg tracking-tighter font-mono leading-tight text-muted-foreground">
                                                                        {isCrypto ? "$" : "रु"} {formatHoldingAmount(current, isCrypto)}
                                                                    </div>
                                                                    <div className="text-[9px] sm:text-[10px] font-black text-muted-foreground/60">
                                                                        Current Price
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="font-black text-sm sm:text-lg tracking-tighter font-mono leading-tight">
                                                                        {isCrypto ? "$" : "रु"} {formatHoldingAmount(value, isCrypto)}
                                                                    </div>
                                                                    <div className={cn(
                                                                        "text-[9px] sm:text-[10px] flex items-center gap-1 font-black",
                                                                        isDailyNeutral
                                                                            ? "text-muted-foreground"
                                                                            : isDailyProfit
                                                                                ? "text-success"
                                                                                : "text-error"
                                                                    )}>
                                                                        <span className="hidden sm:inline">{isDailyProfit ? "+" : ""}{formatHoldingAmount(dailyChange * item.units, isCrypto)}</span>
                                                                        <span className="sm:hidden">{isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(1)}%</span>
                                                                        <span className="hidden sm:inline">({isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(2)}%)</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {!isZeroHolding && !showSoldStocks && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-red-500/40 hover:text-red-600 hover:bg-red-500/5 rounded-full shrink-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    showConfirm(
                                                                        "Remove Holding",
                                                                        `Are you sure you want to remove ${item.symbol} from your portfolio?`,
                                                                        () => {
                                                                            deletePortfolioItem(item.id)
                                                                            toast.success("Holding removed")
                                                                        },
                                                                        "Remove",
                                                                        true
                                                                    )
                                                                }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-left">
                                Recent Transactions
                                <Badge variant="secondary" className="rounded-full font-black">{portfolioTransactions.length}</Badge>
                            </h3>
                            <div className="flex gap-2">
                                {selectedTxs.length > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDeleteSelected}
                                        className="h-8 font-bold"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                        Delete ({selectedTxs.length})
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 font-medium bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                                    onClick={triggerFileUpload}
                                    title="Import"
                                >
                                    <Upload className="w-3.5 h-3.5 sm:mr-2" />
                                    <span className="hidden sm:inline">Import</span>
                                </Button>
                                {portfolioTransactions.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 font-bold text-red-500 hover:text-red-600 hover:bg-red-500/5"
                                        onClick={() => {
                                            showConfirm(
                                                "Clear Portfolio History",
                                                "Are you sure you want to clear all transaction history for THIS portfolio? Holdings will also be wiped.",
                                                async () => {
                                                    await clearPortfolioHistory()
                                                    toast.success("Portfolio history cleared")
                                                },
                                                "Clear",
                                                true
                                            )
                                        }}
                                        title="Clear History"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 sm:mr-2" />
                                        <span className="hidden sm:inline">Clear History</span>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {sortedTransactions.length > 0 && (
                            <div className="flex items-center gap-2 px-6 py-2 bg-muted/20 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
                                <Checkbox
                                    checked={selectedTxs.length === sortedTransactions.length && sortedTransactions.length > 0}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    aria-label="Select all transactions"
                                />
                                <span>Select All</span>
                            </div>
                        )}

                        <ScrollArea className="h-[500px] rounded-2xl border bg-card/50 shadow-inner">
                            <div className="p-4 space-y-3">
                                {sortedTransactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4 ring-8 ring-muted/20">
                                            <History className="w-10 h-10 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-xl font-bold">No history available</h3>
                                        <p className="text-sm text-muted-foreground max-w-[300px] mt-2 text-left">
                                            Your share transactions will appear here. Record one or import data to start.
                                        </p>
                                    </div>
                                ) : (
                                    sortedTransactions.map((tx) => {
                                        const isCredit = ['buy', 'ipo', 'reinvestment', 'bonus', 'gift', 'merger_in'].includes(tx.type)
                                        return (
                                            <div
                                                key={tx.id}
                                                className={cn(
                                                    "flex items-center justify-between p-3 sm:p-4 rounded-xl border bg-background hover:bg-muted/30 transition-all group cursor-pointer text-left gap-2",
                                                    selectedTxs.includes(tx.id) && "border-primary bg-primary/5 hover:bg-primary/10"
                                                )}
                                                onClick={() => toggleTxSelection(tx.id)}
                                            >
                                                <div className="flex gap-2 sm:gap-4 overflow-hidden items-center min-w-0 flex-1">
                                                    <Checkbox
                                                        checked={selectedTxs.includes(tx.id)}
                                                        onCheckedChange={() => toggleTxSelection(tx.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mr-1 shrink-0"
                                                    />
                                                    <div className={cn(
                                                        "w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border shadow-sm shrink-0",
                                                        tx.type === 'buy' ? "bg-blue-500/10 text-blue-600 border-blue-500/10" :
                                                            tx.type === 'reinvestment' ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/10" :
                                                            tx.type === 'sell' ? "bg-orange-500/10 text-orange-600 border-orange-500/10" :
                                                                tx.type === 'bonus' || tx.type === 'gift' ? "bg-purple-500/10 text-purple-600 border-purple-500/10" :
                                                                    tx.type === 'ipo' ? "bg-green-500/10 text-green-600 border-green-500/10" :
                                                                        "bg-muted text-foreground border-muted-foreground/20"
                                                    )}>
                                                        {tx.type === 'buy' && <ArrowDownLeft className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                        {tx.type === 'reinvestment' && <RefreshCcw className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                        {tx.type === 'sell' && <ArrowUpRight className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                        {(tx.type === 'bonus' || tx.type === 'gift') && <Gift className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                        {tx.type === 'ipo' && <FileText className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                        {(tx.type === 'merger_in' || tx.type === 'merger_out') && <RefreshCcw className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                            <h4 className="font-bold text-sm sm:text-base whitespace-nowrap">{tx.symbol}</h4>
                                                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-4 px-1 uppercase tracking-tighter">
                                                                {tx.type}
                                                            </Badge>
                                                        </div>
                                                        <p className="hidden sm:block text-xs text-muted-foreground truncate font-medium mt-0.5">
                                                            {tx.description}
                                                        </p>
                                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground opacity-70">
                                                            {new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                                                    <div className="text-right">
                                                        <div className={cn("font-extrabold text-sm sm:text-lg", isCredit ? "text-success" : "text-warning")}>
                                                            {isCredit ? "+" : "-"}{formatUnits(tx.quantity)} <span className="hidden sm:inline text-[10px] opacity-70 font-bold uppercase">Units</span>
                                                        </div>
                                                        {tx.price > 0 && (
                                                            <div className="text-[9px] sm:text-[10px] text-muted-foreground font-bold">
                                                                @ रु{tx.price.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40 bg-popover border-border shadow-lg">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setEditingTransaction(tx)
                                                                    setIsEditModalOpen(true)
                                                                }}
                                                                className="cursor-pointer text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary rounded-sm"
                                                            >
                                                                <Edit3 className="w-4 h-4 mr-2 text-primary" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    showConfirm(
                                                                        "Delete Transaction",
                                                                        `Are you sure you want to delete this transaction for ${tx.symbol}?`,
                                                                        () => {
                                                                            deleteShareTransaction(tx.id).then((updated) => {
                                                                                toast.success("Transaction deleted")
                                                                                fetchPortfolioPrices(updated)
                                                                            })
                                                                        },
                                                                        "Delete",
                                                                        true
                                                                    )
                                                                }}
                                                                className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive rounded-sm"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </TabsContent>
            </Tabs>

            <EditTransactionModal
                open={isEditModalOpen}
                onOpenChange={(next) => {
                    setIsEditModalOpen(next)
                    if (!next) {
                        setEditingTransaction(null)
                    }
                }}
                transaction={editingTransaction}
                onUpdate={handleUpdateTransaction}
                stockOptions={stockOptions}
                portfolioStockOptions={portfolioStockOptions}
                portfolioCryptoOptions={portfolioCryptoOptions}
                currencySymbol={currencySymbol}
            />

            {portfolio.length > 0 && (
                <div className="flex items-center justify-center gap-2 bg-muted/20 py-2 rounded-full border border-muted/50 mx-auto max-w-fit px-6">
                    <p className="text-[10px] text-muted-foreground font-black flex items-center gap-1.5 uppercase tracking-widest opacity-80">
                        <RefreshCcw className="w-3 h-3 text-primary animate-pulse" />
                        Live Market Connection • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            )}
        </div>
    )
}
