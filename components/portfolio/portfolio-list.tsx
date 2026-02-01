"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, RefreshCcw, TrendingUp, TrendingDown, Trash2, Search, History, Download, Upload, FileText, ArrowUpRight, ArrowDownLeft, Gift, Share2, PieChart as PieChartIcon, LayoutGrid, Info, ChevronDown, ChevronUp, Activity, BarChart3, Sparkles, Calendar, ExternalLink, ChevronLeft } from "lucide-react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useWalletData } from "@/contexts/wallet-data-context"
import { PortfolioItem, ShareTransaction, Portfolio } from "@/types/wallet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CreatePortfolioModal } from "./modals/create-portfolio-modal"
import { AddTransactionModal } from "./modals/add-transaction-modal"
import { ImportVerificationModal } from "./modals/import-verification-modal"
import { StockDetailModal } from "./modals/stock-detail-modal"

export function PortfolioList() {
    const {
        portfolio,
        shareTransactions,
        addPortfolioItem,
        updatePortfolioItem,
        deletePortfolioItem,
        fetchPortfolioPrices,
        addShareTransaction,
        deleteShareTransaction,
        deleteMultipleShareTransactions,
        recomputePortfolio,
        importShareData,
        userProfile,
        portfolios,
        activePortfolioId,
        addPortfolio,
        switchPortfolio,
        deletePortfolio,
        updatePortfolio,
        clearPortfolioHistory,
        getFaceValue,
        upcomingIPOs,
        isIPOsLoading,
    } = useWalletData()

    const [viewMode, setViewMode] = useState<"overview" | "detail">("overview")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isChartExpanded, setIsChartExpanded] = useState(false)
    const [importQueue, setImportQueue] = useState<{ symbol: string, defaultPrice: number, type: string }[]>([])
    const [importPrices, setImportPrices] = useState<Record<string, string>>({})
    const [pendingImport, setPendingImport] = useState<{ type: string, data: string } | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("holdings")
    const [chartView, setChartView] = useState<"sector" | "scrip">("sector")
    const [selectedTxs, setSelectedTxs] = useState<string[]>([])
    const [isStockDetailOpen, setIsStockDetailOpen] = useState(false)
    const [selectedStock, setSelectedStock] = useState<PortfolioItem | null>(null)
    const [newPortfolio, setNewPortfolio] = useState({
        name: "",
        description: "",
        color: "#3b82f6"
    })

    // Auto-refresh data on mount and every 2 minutes
    useEffect(() => {
        // Initial fetch
        fetchPortfolioPrices()

        // Set interval for 2 minutes
        const interval = setInterval(() => {
            fetchPortfolioPrices()
        }, 2 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    const handleViewStockDetail = (item: PortfolioItem) => {
        setSelectedStock(item)
        setIsStockDetailOpen(true)
    }

    const [newTx, setNewTx] = useState({
        symbol: "",
        quantity: 0,
        price: 0,
        type: "buy" as ShareTransaction['type'],
        date: new Date().toISOString().split('T')[0],
        description: ""
    })

    const filteredPortfolio = portfolio.filter(item =>
        item.portfolioId === activePortfolioId &&
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const portfolioTransactions = shareTransactions.filter(t => t.portfolioId === activePortfolioId)

    const sortedTransactions = [...portfolioTransactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await fetchPortfolioPrices(undefined, true) // Force refresh bypasses cache
            toast.success("Prices updated successfully")
        } catch (error: any) {
            toast.error(error.message || "Failed to update prices")
        } finally {
            setIsRefreshing(false)
        }
    }

    const handleAddTransaction = async () => {
        if (!newTx.symbol || newTx.quantity <= 0 || (newTx.type !== 'bonus' && newTx.price <= 0)) {
            toast.error("Please fill all fields correctly")
            return
        }

        try {
            const { updatedPortfolio } = await addShareTransaction({
                portfolioId: activePortfolioId!,
                symbol: newTx.symbol.toUpperCase(),
                quantity: newTx.quantity,
                price: newTx.price,
                type: newTx.type,
                date: newTx.date,
                description: newTx.description || `${newTx.type.toUpperCase()} ${newTx.quantity} units of ${newTx.symbol}`
            })

            setNewTx({
                symbol: "",
                quantity: 0,
                price: 0,
                type: "buy",
                date: new Date().toISOString().split('T')[0],
                description: ""
            })
            setIsAddDialogOpen(false)
            setActiveTab("holdings")
            toast.success("Transaction recorded")
            fetchPortfolioPrices(updatedPortfolio)
        } catch (error) {
            toast.error("Failed to record transaction")
        }
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
                // Pre-process CSV to see if we need prices
                const rows = content.split('\n').map(row => row.split(',').map(cell => cell.replace(/"/g, '').trim()))
                if (rows.length < 2) return

                const header = rows[0].join(',')
                let type: 'portfolio' | 'history' = 'portfolio'
                if (header.includes('Transaction Date') || header.includes('History Description')) {
                    type = 'history'
                }

                const symbolsToPrice = new Map<string, { symbol: string, defaultPrice: number, type: string }>()

                if (type === 'portfolio') {
                    rows.slice(1).forEach(row => {
                        if (row.length < 7 || row[0].toLowerCase().includes('total')) return
                        const symbol = row[1]
                        const ltp = parseFloat(row[5]) || parseFloat(row[3]) || 100
                        if (symbol) {
                            symbolsToPrice.set(symbol, { symbol, defaultPrice: ltp, type: 'Holding' })
                        }
                    })
                } else {
                    rows.slice(1).forEach(row => {
                        if (row.length < 7) return
                        const symbol = row[1]
                        const date = row[2]
                        const desc = row[6]
                        const credit = parseFloat(row[3]) || 0
                        const isIpo = desc.includes('IPO') || desc.includes('INITIAL PUBLIC OFFERING')
                        const isMerger = desc.includes('Merger') && credit > 0
                        const isBuy = !isIpo && !isMerger && credit > 0 && !desc.includes('BONUS')

                        if (symbol && (isIpo || isBuy || isMerger)) {
                            const typeStr = isIpo ? 'IPO' : (isMerger ? 'Merger' : 'Buy')
                            const def = (isIpo || isMerger) ? getFaceValue(symbol) : 0
                            symbolsToPrice.set(symbol, { symbol, defaultPrice: def, type: typeStr })
                        }
                    })
                }

                if (symbolsToPrice.size > 0) {
                    const queue = Array.from(symbolsToPrice.values())
                    setImportQueue(queue)
                    const initialPrices: Record<string, string> = {}
                    queue.forEach(item => {
                        initialPrices[item.symbol] = item.defaultPrice.toString()
                    })
                    setImportPrices(initialPrices)
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

            const updated = await importShareData(pendingImport.type as any, pendingImport.data, resolved)
            setIsImportModalOpen(false)
            setPendingImport(null)
            toast.success("Data imported with cost prices")
            // Refresh with the newly imported data
            if (updated) fetchPortfolioPrices(updated)
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const triggerFileUpload = () => {
        fileInputRef.current?.click()
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

        if (confirm(`Are you sure you want to delete ${selectedTxs.length} transactions? This will recalculate your portfolio.`)) {
            try {
                const updatedPortfolio = await deleteMultipleShareTransactions(selectedTxs)
                setSelectedTxs([])
                toast.success(`${selectedTxs.length} transactions deleted and portfolio updated`)
                fetchPortfolioPrices(updatedPortfolio)
            } catch (error) {
                toast.error("Failed to delete transactions")
            }
        }
    }

    // Calculations
    const activePortfolioItems = portfolio.filter(p => p.portfolioId === activePortfolioId)
    const totalInvestment = activePortfolioItems.reduce((sum, item) => sum + (item.units * item.buyPrice), 0)
    const currentValue = activePortfolioItems.reduce((sum, item) => sum + (item.units * (item.currentPrice || item.buyPrice)), 0)
    const totalProfitLoss = currentValue - totalInvestment
    const totalProfitLossPercentage = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0

    const todayChange = activePortfolioItems.reduce((sum, item) => {
        if (item.currentPrice && item.previousClose) {
            return sum + (item.units * (item.currentPrice - item.previousClose))
        }
        return sum
    }, 0)
    const todayChangePercentage = (currentValue - todayChange) > 0 ? (todayChange / (currentValue - todayChange)) * 100 : 0

    // Distribution Calculations
    const sectorMap = new Map<string, { value: number; count: number }>()
    const scripMap = new Map<string, number>()

    activePortfolioItems.forEach(item => {
        const sector = item.sector || "Others"
        const value = item.units * (item.currentPrice || item.buyPrice)

        // Sector
        const currentSector = sectorMap.get(sector) || { value: 0, count: 0 }
        sectorMap.set(sector, {
            value: currentSector.value + value,
            count: currentSector.count + 1
        })

        // Scrip
        scripMap.set(item.symbol, (scripMap.get(item.symbol) || 0) + value)
    })

    const sectorData = Array.from(sectorMap.entries())
        .map(([name, data]) => ({
            name,
            value: data.value,
            count: data.count,
            percentage: currentValue > 0 ? (data.value / currentValue) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)

    const scripData = Array.from(scripMap.entries())
        .map(([name, value]) => ({
            name,
            value,
            percentage: currentValue > 0 ? (value / currentValue) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)

    const activeChartData = chartView === "sector" ? sectorData : scripData
    const SECTOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

    const getPortfolioSummary = (pid: string) => {
        const items = portfolio.filter(p => p.portfolioId === pid)
        const investment = items.reduce((sum, item) => sum + (item.units * item.buyPrice), 0)
        const current = items.reduce((sum, item) => sum + (item.units * (item.currentPrice || item.buyPrice)), 0)
        return { investment, current, count: items.length }
    }

    const renderOverviewHeader = () => {
        const totalInvest = portfolios.reduce((sum, p) => sum + getPortfolioSummary(p.id).investment, 0)
        const totalCurrent = portfolios.reduce((sum, p) => sum + getPortfolioSummary(p.id).current, 0)
        const totalPl = totalCurrent - totalInvest
        const totalPlPerc = totalInvest > 0 ? (totalPl / totalInvest) * 100 : 0

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
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
                            totalPl >= 0 ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                        )}>
                            {totalPl >= 0 ? "+" : ""}{totalPl.toLocaleString()} ({totalPlPerc.toFixed(2)}%)
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md text-left">
                    <CardHeader className="pb-2 px-3 sm:px-6">
                        <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Portfolios</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl font-black font-mono">{portfolios.length}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-wide">Active</Badge>
                    </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-muted/50 shadow-md text-left">
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
                        <CardDescription className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Diversification</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl font-black font-mono">High</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary">
                                    {i}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const renderPortfolioCard = (p: Portfolio) => {
        const summary = getPortfolioSummary(p.id);
        const profitLoss = summary.current - summary.investment;
        const profitPerc = summary.investment > 0 ? (profitLoss / summary.investment) * 100 : 0;
        const isProfit = profitLoss >= 0;

        return (
            <Card
                key={p.id}
                className="group cursor-pointer border-muted/50 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col text-left"
                onClick={() => {
                    switchPortfolio(p.id)
                    setViewMode("detail")
                }}
            >
                <CardHeader className="pb-3 sm:pb-4 relative px-4 sm:px-6">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                            Portfolio
                        </Badge>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-500/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete portfolio "${p.name}"? This action cannot be undone.`)) deletePortfolio(p.id);
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
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Return</span>
                            <span className={cn(
                                "text-base sm:text-lg font-black font-mono",
                                isProfit ? "text-green-600" : "text-red-600"
                            )}>
                                {isProfit ? "+" : ""}{profitPerc.toFixed(1)}%
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
                        className={cn("h-full transition-all duration-1000", isProfit ? "bg-green-500" : "bg-red-500")}
                        style={{ width: `${Math.min(Math.abs(profitPerc), 100)}%` }}
                    />
                </div>
            </Card>
        )
    }

    if (viewMode === "overview") {
        return (
            <>
                <div className="space-y-8 animate-in fade-in duration-500 text-left">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase">My Portfolios</h2>
                            <p className="text-muted-foreground text-sm font-medium">Select a portfolio to view detailed analysis</p>
                        </div>
                        <Button
                            onClick={() => setIsCreatePortfolioOpen(true)}
                            className="rounded-xl font-bold shadow-lg shadow-primary/20 px-6"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New
                        </Button>
                    </div>

                    <div className="mt-8">
                        {renderOverviewHeader()}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            ) : upcomingIPOs.length > 0 ? (
                                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-xl overflow-hidden backdrop-blur-sm text-left">
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-primary/10">
                                        <div>
                                            <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-widest mb-1.5 px-2">Live Now</Badge>
                                            <CardTitle className="text-lg font-black flex items-center gap-2">Upcoming IPOs & Rights</CardTitle>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-primary text-[10px] font-black uppercase tracking-wider">
                                            See All
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-muted/10">
                                            {upcomingIPOs.slice(0, 5).map((ipo, i) => {
                                                const dateParts = ipo.date_range.split(/ to | - |-|–|—/);
                                                const openDate = dateParts[0]?.trim();
                                                const closeDate = dateParts[1]?.trim();

                                                return (
                                                    <div key={i} className="group/item flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-primary/[0.02] transition-all relative overflow-hidden gap-3 sm:gap-4">
                                                        <div className="flex flex-col gap-1.5 relative z-10 min-w-0 flex-1">
                                                            <span className="font-black text-sm text-foreground/90 group-hover/item:text-primary transition-colors leading-tight truncate">
                                                                {ipo.company}
                                                            </span>
                                                            <div className="flex items-center flex-wrap gap-y-1 gap-x-3 sm:gap-x-4">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                                                                        <Calendar className="w-3 h-3 text-primary" />
                                                                        <span className="text-[10px] font-black text-primary uppercase tracking-tight">
                                                                            Opens: {openDate}
                                                                        </span>
                                                                    </div>
                                                                    {closeDate && (
                                                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tight">
                                                                            Till {closeDate}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                                                    <LayoutGrid className="w-3 h-3 text-primary/40" />
                                                                    <span className="text-[10px] font-bold uppercase tracking-tight">{ipo.units} Units</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={ipo.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-2 bg-background hover:bg-primary text-foreground/70 hover:text-primary-foreground px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-sm border border-border group-hover/item:border-primary/30 group-hover/item:shadow-lg group-hover/item:shadow-primary/10 relative z-10 w-full sm:w-auto shrink-0"
                                                        >
                                                            Details <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                        <div className="absolute inset-y-0 left-0 w-1 bg-primary scale-y-0 group-hover/item:scale-y-100 transition-transform origin-center" />
                                                    </div>
                                                )
                                            })}
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
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Snapshot of current performance</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-center items-center py-10">
                                    <div className="w-24 h-24 rounded-full border-8 border-primary/20 flex items-center justify-center mb-6">
                                        <div className="w-16 h-16 rounded-full border-4 border-primary animate-pulse flex items-center justify-center">
                                            <TrendingUp className="w-8 h-8 text-primary" />
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-black mb-2">Bullish Intensity</h4>
                                    <p className="text-xs text-muted-foreground text-center max-w-[240px] font-medium leading-relaxed italic">
                                        Higher IPO participation often indicates strong market liquidity and positive retail sentiment.
                                    </p>
                                </CardContent>
                                <div className="p-4 bg-muted/10 border-t border-muted/20 flex justify-center">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Source: Market Live Feed</Badge>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
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

            {/* Header section */}
            <div className="flex flex-col gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-2"
                    onClick={() => setViewMode("overview")}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
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
                        />
                    </div>

                </div>
            </div>

            {/* Stock Detail Modal */}
            <StockDetailModal
                item={selectedStock}
                open={isStockDetailOpen}
                onOpenChange={setIsStockDetailOpen}
            />

            {/* Import Price Modal */}
            <ImportVerificationModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                importQueue={importQueue}
                importPrices={importPrices}
                setImportPrices={setImportPrices}
                onConfirm={handleConfirmImport}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Summary Cards Column */}
                <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-2 px-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0">
                    <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20 shadow-md overflow-hidden relative group transition-all duration-300 hover:shadow-primary/10 min-w-[110px] sm:min-w-[120px] flex-1 lg:min-w-0 lg:p-2">
                        <CardHeader className="pb-1 px-2 sm:px-4 pt-2 sm:pt-4">
                            <div className="flex items-center justify-between mb-0.5">
                                <CardDescription className="text-foreground/60 font-bold text-[8px] sm:text-[9px] uppercase tracking-widest">Net Worth</CardDescription>
                                <div className="p-0.5 bg-primary/10 rounded-lg text-primary">
                                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </div>
                            </div>
                            <CardTitle className="text-sm sm:text-lg lg:text-base font-black tracking-tight font-mono">
                                रु {currentValue.toLocaleString()}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-2 sm:pb-4">
                            <div className={cn(
                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-tight",
                                totalProfitLoss >= 0 ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                            )}>
                                {totalProfitLoss >= 0 ? "+" : ""}{totalProfitLoss.toLocaleString()} ({totalProfitLossPercentage.toFixed(1)}%)
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-muted/50 bg-card/40 backdrop-blur-sm shadow-sm border hover:border-primary/10 transition-colors min-w-[100px] sm:min-w-[110px] flex-1 lg:min-w-0 lg:p-2">
                        <CardHeader className="pb-1 space-y-0 text-left px-2 sm:px-4 pt-2 sm:pt-4">
                            <CardDescription className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Today's Move</CardDescription>
                            <CardTitle className="text-sm sm:text-lg lg:text-base font-black font-mono flex items-center gap-1">
                                <span className={todayChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {todayChange >= 0 ? "+" : ""}{todayChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-2 sm:pb-4">
                            <div className="flex items-center gap-1">
                                {todayChange >= 0 ? (
                                    <div className="text-[8px] sm:text-[9px] font-black text-green-600 bg-green-500/10 px-1 py-0.5 rounded border border-green-500/20">
                                        +{todayChangePercentage.toFixed(1)}%
                                    </div>
                                ) : (
                                    <div className="text-[8px] sm:text-[9px] font-black text-red-600 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">
                                        {todayChangePercentage.toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-muted/50 bg-card/40 backdrop-blur-sm shadow-sm border hover:border-primary/10 transition-colors min-w-[100px] sm:min-w-[110px] flex-1 lg:min-w-0 lg:p-2">
                        <CardHeader className="pb-1 text-left px-2 sm:px-4 pt-2 sm:pt-4">
                            <CardDescription className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Total Stake</CardDescription>
                            <CardTitle className="text-sm sm:text-lg lg:text-base font-black font-mono">
                                रु {totalInvestment.toLocaleString()}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 pb-2 sm:pb-4">
                            <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] sm:text-[9px] rounded border-primary/20 font-black px-1 uppercase tracking-wide">
                                {portfolio.length} Scrips
                            </Badge>
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
                                    <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                    <span className="truncate">{chartView === "sector" ? "Sector Allocation" : "Stock Allocation"}</span>
                                </CardTitle>
                                <CardDescription className="text-xs font-medium hidden sm:block">
                                    {chartView === "sector"
                                        ? "Portfolio distribution by industry sector"
                                        : "Portfolio weighting by individual scrip"}
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
                                        variant={chartView === "sector" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn("h-6 sm:h-7 px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg transition-all", chartView === "sector" && "bg-background shadow-sm")}
                                        onClick={() => setChartView("sector")}
                                    >
                                        Sectors
                                    </Button>
                                    <Button
                                        variant={chartView === "scrip" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn("h-6 sm:h-7 px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg transition-all", chartView === "scrip" && "bg-background shadow-sm")}
                                        onClick={() => setChartView("scrip")}
                                    >
                                        Stocks
                                    </Button>
                                </div>
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
                            <PieChartIcon className="w-8 h-8 text-primary/40 mb-2" />
                            <span className="text-xs font-bold text-muted-foreground">Tap to view chart</span>
                        </div>
                        {activePortfolioItems.length > 0 ? (
                            <>
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
                                                dataKey="value"
                                                stroke="none"
                                                animationBegin={0}
                                                animationDuration={1000}
                                            >
                                                {activeChartData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${chartView}-${index}`}
                                                        fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
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
                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Value</span>
                                                                        <span className="text-[10px] font-black text-right">रु{data.value.toLocaleString()}</span>
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
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-6 text-center">
                                <PieChartIcon className="w-12 h-12 mb-4 opacity-10" />
                                <p className="text-xs font-bold uppercase tracking-widest opacity-40">Add holdings to see distribution data</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="holdings" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                        <div className="hidden sm:flex items-center bg-background/50 border border-muted/50 rounded-xl px-2 h-10 gap-1 shadow-inner">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary bg-primary/10 shadow-sm border border-primary/10">
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <TabsContent value="holdings" className="mt-0">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    My Holdings
                                    <Badge variant="secondary" className="rounded-full font-black">{filteredPortfolio.length}</Badge>
                                    <div className="flex gap-1 ml-1">
                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] font-black py-0 px-1.5 h-4">
                                            {activePortfolioItems.filter(p => (p.currentPrice || p.buyPrice) > p.buyPrice).length}↑
                                        </Badge>
                                        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[9px] font-black py-0 px-1.5 h-4">
                                            {activePortfolioItems.filter(p => (p.currentPrice || p.buyPrice) < p.buyPrice).length}↓
                                        </Badge>
                                    </div>
                                </h3>
                                {activePortfolioItems.length > 0 && activePortfolioItems[0]?.lastUpdated && (
                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                        <RefreshCcw className="w-2.5 h-2.5" />
                                        Synced {new Date(activePortfolioItems.reduce((latest, item) => {
                                            const itemDate = new Date(item.lastUpdated || 0).getTime();
                                            return itemDate > latest ? itemDate : latest;
                                        }, 0)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 text-left">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    aria-label="Import portfolio data"
                                />
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
                            <div className="p-4 space-y-3 text-left">
                                {filteredPortfolio.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4 ring-8 ring-muted/20">
                                            <TrendingUp className="w-10 h-10 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-xl font-bold">No active holdings</h3>
                                        <p className="text-sm text-muted-foreground max-w-[300px] mt-2">
                                            Start by adding transactions or upload your Mero Share CSV to see your portfolio in action.
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
                                    filteredPortfolio.map((item) => {
                                        const current = item.currentPrice || item.buyPrice
                                        const investment = item.units * item.buyPrice
                                        const value = item.units * current
                                        const profitLoss = value - investment
                                        const profitLossPerc = investment > 0 ? (profitLoss / investment) * 100 : 0
                                        const isProfit = profitLoss >= 0
                                        const dailyChange = item.change || (item.currentPrice && item.previousClose ? item.currentPrice - item.previousClose : 0)
                                        const dailyChangePerc = item.percentChange || (item.previousClose ? (dailyChange / item.previousClose) * 100 : 0)
                                        const isDailyProfit = dailyChange >= 0

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
                                                            isProfit ? "bg-green-500/5 text-green-600 border-green-500/10" : "bg-red-500/5 text-red-600 border-red-500/10"
                                                        )}>
                                                            {item.symbol.substring(0, 2)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                                <h4 className="font-extrabold text-sm sm:text-base tracking-tight">{item.symbol}</h4>
                                                                <Badge variant="outline" className="hidden sm:inline-flex text-[9px] h-4 px-1.5 bg-muted/50 font-bold border-muted-foreground/20 uppercase tracking-widest text-muted-foreground/80">
                                                                    {item.sector || "Others"}
                                                                </Badge>
                                                                <Info className="hidden sm:block w-3 h-3 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                                                                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">{item.units} Units</span>
                                                                <span className="hidden sm:inline text-[10px] opacity-20">•</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                                                                        रु {current.toLocaleString()}
                                                                    </span>
                                                                    {item.previousClose && (
                                                                        <span
                                                                            className={cn(
                                                                                "hidden sm:inline-flex text-[9px] font-black px-1.5 py-0.5 rounded-md items-center gap-0.5",
                                                                                isDailyProfit ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                                                                            )}
                                                                        >
                                                                            {isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(1)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                                        <div className="text-right flex flex-col items-end">
                                                            <div className="font-black text-sm sm:text-lg tracking-tighter font-mono leading-tight">
                                                                रु {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                            </div>
                                                            <div className={cn(
                                                                "text-[9px] sm:text-[10px] flex items-center gap-1 font-black",
                                                                isDailyProfit ? "text-green-600" : "text-red-600"
                                                            )}>
                                                                <span className="hidden sm:inline">{isDailyProfit ? "+" : ""}{(dailyChange * item.units).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                <span className="sm:hidden">{isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(1)}%</span>
                                                                <span className="hidden sm:inline">({isDailyProfit ? "+" : ""}{dailyChangePerc.toFixed(2)}%)</span>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500/40 hover:text-red-600 hover:bg-red-500/5 rounded-full shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (confirm(`Remove ${item.symbol} from portfolio?`)) {
                                                                    deletePortfolioItem(item.id)
                                                                    toast.success("Holding removed")
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
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
                                        onClick={async () => {
                                            if (confirm("Are you sure you want to clear all transaction history for THIS portfolio? Holdings will also be wiped.")) {
                                                await clearPortfolioHistory()
                                                toast.success("Portfolio history cleared")
                                            }
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
                                        const isCredit = ['buy', 'ipo', 'bonus', 'merger_in'].includes(tx.type)
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
                                                            tx.type === 'sell' ? "bg-orange-500/10 text-orange-600 border-orange-500/10" :
                                                                tx.type === 'bonus' ? "bg-purple-500/10 text-purple-600 border-purple-500/10" :
                                                                    tx.type === 'ipo' ? "bg-green-500/10 text-green-600 border-green-500/10" :
                                                                        "bg-muted text-foreground border-muted-foreground/20"
                                                    )}>
                                                        {tx.type === 'buy' && <ArrowDownLeft className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                        {tx.type === 'sell' && <ArrowUpRight className="w-4 h-4 sm:w-6 sm:h-6" />}
                                                        {tx.type === 'bonus' && <Gift className="w-4 h-4 sm:w-6 sm:h-6" />}
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
                                                        <div className={cn("font-extrabold text-sm sm:text-lg", isCredit ? "text-green-600" : "text-orange-600")}>
                                                            {isCredit ? "+" : "-"}{tx.quantity} <span className="hidden sm:inline text-[10px] opacity-70 font-bold uppercase">Units</span>
                                                        </div>
                                                        {tx.price > 0 && (
                                                            <div className="text-[9px] sm:text-[10px] text-muted-foreground font-bold">
                                                                @ रु{tx.price.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-red-500 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                        onClick={() => {
                                                            if (confirm(`Delete transaction for ${tx.symbol}?`)) {
                                                                deleteShareTransaction(tx.id).then((updated) => {
                                                                    toast.success("Transaction deleted")
                                                                    fetchPortfolioPrices(updated)
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                    </Button>
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
