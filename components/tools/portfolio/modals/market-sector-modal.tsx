"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { BarChart3, TrendingUp, TrendingDown, Loader2, ChevronRight } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, Tooltip } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, getNumberFormatLocale } from "@/lib/utils"
import { TopStockItem, NepseIndexGraphPoint, NepseIndexDetail } from "@/types/wallet"

export type MarketSectorKey =
    | "nepse"
    | "sensitive"
    | "float"
    | "sensitive_float"
    | "banking"
    | "dev_bank"
    | "finance"
    | "hotel_tourism"
    | "hydro"
    | "investment"
    | "life_insurance"
    | "manufacturing"
    | "microfinance"
    | "mutual_fund"
    | "non_life_insurance"
    | "others"
    | "trading"

const SECTOR_TABS: { key: MarketSectorKey; label: string; short: string }[] = [
    { key: "nepse", label: "NEPSE Index", short: "NEPSE" },
    { key: "sensitive", label: "Sensitive", short: "SENS" },
    { key: "float", label: "Float", short: "FLOAT" },
    { key: "sensitive_float", label: "Sensitive Float", short: "S-FLOAT" },
    { key: "banking", label: "Banking", short: "BANK" },
    { key: "dev_bank", label: "Development Bank", short: "DEV-B" },
    { key: "finance", label: "Finance", short: "FIN" },
    { key: "hotel_tourism", label: "Hotel & Tourism", short: "HOTEL" },
    { key: "hydro", label: "Hydropower", short: "HYDRO" },
    { key: "investment", label: "Investment", short: "INV" },
    { key: "life_insurance", label: "Life Insurance", short: "LIFE" },
    { key: "manufacturing", label: "Manufacturing", short: "MFG" },
    { key: "microfinance", label: "Microfinance", short: "MICRO" },
    { key: "mutual_fund", label: "Mutual Fund", short: "MF" },
    { key: "non_life_insurance", label: "Non-Life Insurance", short: "NON-LIFE" },
    { key: "others", label: "Others", short: "OTHER" },
    { key: "trading", label: "Trading", short: "TRAD" },
]

const SECTOR_NAME_MAP: Record<MarketSectorKey, string[]> = {
    nepse: [],
    sensitive: [],
    float: [],
    sensitive_float: [],
    banking: ["Banking", "Commercial Bank"],
    dev_bank: ["Development Bank", "Development"],
    finance: ["Finance"],
    hotel_tourism: ["Hotel", "Tourism", "Hotels"],
    hydro: ["Hydropower", "Power"],
    investment: ["Investment"],
    life_insurance: ["Life Insurance", "Life"],
    manufacturing: ["Manufacturing"],
    microfinance: ["Microfinance", "Micro Finance"],
    mutual_fund: ["Mutual Fund", "Mutual"],
    non_life_insurance: ["Non-Life Insurance", "Non-Life", "Non Life"],
    others: ["Others"],
    trading: ["Trading"],
}

const SECTOR_INDEX_NAME: Record<MarketSectorKey, string[]> = {
    nepse: ["NEPSE Index"],
    sensitive: ["Sensitive Index"],
    float: ["Float Index"],
    sensitive_float: ["Sensitive Float Index"],
    banking: ["Banking SubIndex", "Banking Index"],
    dev_bank: ["Development Bank Index", "Development Bank"],
    finance: ["Finance Index"],
    hotel_tourism: ["Hotels And Tourism Index", "Hotel And Tourism"],
    hydro: ["HydroPower Index", "Hydropower Index"],
    investment: ["Investment Index"],
    life_insurance: ["Life Insurance"],
    manufacturing: ["Manufacturing And Processing"],
    microfinance: ["Microfinance Index"],
    mutual_fund: ["Mutual Fund"],
    non_life_insurance: ["Non Life Insurance", "Non-Life Insurance"],
    others: ["Others Index"],
    trading: ["Trading Index"],
}

export interface MarketSectorModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialSector?: string
    topStocks?: { top_gainer: TopStockItem[]; top_loser: TopStockItem[]; top_turnover: TopStockItem[] } | null
    sectorsMap?: Record<string, string>
    onOpenStockDetail?: (symbol: string, ltp?: number, pointChange?: number, percentageChange?: number) => void
}

export function MarketSectorModal({
    open,
    onOpenChange,
    initialSector,
    topStocks,
    sectorsMap,
    onOpenStockDetail,
}: MarketSectorModalProps) {
    const [selectedSector, setSelectedSector] = useState<MarketSectorKey>("nepse")
    const [sectorGraph, setSectorGraph] = useState<NepseIndexGraphPoint[]>([])
    const [isLoadingGraph, setIsLoadingGraph] = useState(false)
    const [graphError, setGraphError] = useState<string | null>(null)
    const [moversTab, setMoversTab] = useState<"gainers" | "losers">("gainers")
    const [indexDetails, setIndexDetails] = useState<NepseIndexDetail[]>([])

    useEffect(() => {
        if (!open) return
        const match = SECTOR_TABS.find(
            (s) => s.label.toLowerCase() === (initialSector || "").toLowerCase(),
        )
        if (match) {
            setSelectedSector(match.key as MarketSectorKey)
        } else {
            const sectorMatch = SECTOR_TABS.find(
                (s) => SECTOR_NAME_MAP[s.key].some(
                    (n) => n.toLowerCase() === (initialSector || "").toLowerCase(),
                ),
            )
            if (sectorMatch) {
                setSelectedSector(sectorMatch.key as MarketSectorKey)
            } else {
                setSelectedSector("nepse")
            }
        }
    }, [open, initialSector])

    const fetchSectorGraph = useCallback(async (sector: MarketSectorKey) => {
        setIsLoadingGraph(true)
        setGraphError(null)
        setSectorGraph([])
        try {
            const res = await fetch(`/api/nepse/market-indices/graph?index=${sector}`, {
                headers: { Accept: "application/json" },
            })
            if (!res.ok) {
                throw new Error(`Failed to fetch graph (${res.status})`)
            }
            const data = await res.json()
            if (!Array.isArray(data)) {
                throw new Error("Invalid graph data format")
            }
            setSectorGraph(data as NepseIndexGraphPoint[])
        } catch (err: any) {
            setGraphError(err?.message || "Failed to load graph")
        } finally {
            setIsLoadingGraph(false)
        }
    }, [])

    const fetchIndexDetails = useCallback(async () => {
        try {
            const res = await fetch("/api/nepse/market-indices/graph?detail=1", {
                headers: { Accept: "application/json" },
            })
            if (!res.ok) return
            const data = await res.json()
            if (Array.isArray(data)) {
                setIndexDetails(data as NepseIndexDetail[])
            }
        } catch {
            // non-fatal: fall back to graph-derived stats
        }
    }, [])

    useEffect(() => {
        if (open) {
            void fetchIndexDetails()
        }
    }, [open, fetchIndexDetails])

    useEffect(() => {
        if (open) {
            fetchSectorGraph(selectedSector)
        }
    }, [open, selectedSector, fetchSectorGraph])

    const chartData = useMemo(() => {
        if (!sectorGraph.length) return []
        const firstTs = sectorGraph[0][0]
        let prevTs = Number.NaN
        const deduped = sectorGraph
            .filter(([ts]) => ts >= firstTs)
            .filter(([ts]) => {
                if (ts === prevTs) return false
                prevTs = ts
                return true
            })
            .map(([ts, value]) => {
                const date = new Date(ts * 1000)
                const hours = date.getHours().toString().padStart(2, "0")
                const mins = date.getMinutes().toString().padStart(2, "0")
                return {
                    time: `${hours}:${mins}`,
                    value: Number(value.toFixed(2)),
                }
            })
        if (deduped.length === 0) return []
        const first = deduped[0]
        const last = deduped[deduped.length - 1]
        return [
            { time: first.time, value: first.value },
            { time: first.time, value: first.value },
            ...deduped,
            { time: last.time, value: last.value },
            { time: last.time, value: last.value },
        ]
    }, [sectorGraph])

    const selectedIndexDetail = useMemo(() => {
        const names = SECTOR_INDEX_NAME[selectedSector]
        return indexDetails.find((d) => names.some((n) => d.index.toLowerCase() === n.toLowerCase())) ?? null
    }, [indexDetails, selectedSector])

    const chartStats = useMemo(() => {
        if (!chartData.length) return null
        const values = chartData.map((d) => d.value)
        const open = values[0]
        const close = values[values.length - 1]
        const high = Math.max(...values)
        const low = Math.min(...values)
        const lastTime = chartData[chartData.length - 1]?.time

        if (selectedIndexDetail) {
            const change = selectedIndexDetail.change
            const changePerc = selectedIndexDetail.perChange
            const isPositive = change >= 0
            return {
                open,
                close: selectedIndexDetail.currentValue ?? close,
                high: selectedIndexDetail.high ?? high,
                low: selectedIndexDetail.low ?? low,
                change,
                changePerc,
                isPositive,
                lastTime,
                authoritative: true,
            }
        }

        const change = close - open
        const changePerc = open ? (change / open) * 100 : 0
        const isPositive = change >= 0
        return { open, close, high, low, change, changePerc, isPositive, lastTime, authoritative: false }
    }, [chartData, selectedIndexDetail])

    const sectorTopMovers = useMemo(() => {
        if (!topStocks) return { gainers: [], losers: [] }
        if (selectedSector === "nepse") {
            return {
                gainers: [...(topStocks.top_gainer || [])].sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 8),
                losers: [...(topStocks.top_loser || [])].sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 8),
            }
        }
        const sectorNames = SECTOR_NAME_MAP[selectedSector] || []
        const matchesSector = (symbol: string) => {
            if (!sectorsMap) return false
            const sym = sectorsMap[symbol] || ""
            return sectorNames.some((n) => sym.toLowerCase() === n.toLowerCase())
        }
        return {
            gainers: [...(topStocks.top_gainer || [])].filter((m) => matchesSector(m.symbol)).slice(0, 8),
            losers: [...(topStocks.top_loser || [])].filter((m) => matchesSector(m.symbol)).slice(0, 8),
        }
    }, [topStocks, selectedSector, sectorsMap])

    const activeMovers = moversTab === "gainers" ? sectorTopMovers.gainers : sectorTopMovers.losers
    const activeTabMeta = SECTOR_TABS.find((t) => t.key === selectedSector)
    const hasMovers = sectorTopMovers.gainers.length > 0 || sectorTopMovers.losers.length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] sm:h-[86vh] sm:max-h-[86vh] lg:h-[88vh] lg:max-h-[88vh] overflow-hidden flex flex-col gap-0 p-0">
                <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-border/50">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        Market & Movers
                        <Badge variant="secondary" className="text-[10px] font-bold">
                            {activeTabMeta?.label || "NEPSE"}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="px-5 py-3 shrink-0 border-b border-border/30">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex gap-1.5 pb-1">
                            {SECTOR_TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setSelectedSector(tab.key as MarketSectorKey)}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border shrink-0",
                                        selectedSector === tab.key
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                                    )}
                                >
                                    {tab.short}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <div className="overflow-y-auto px-5 py-4 flex-1 space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold">{activeTabMeta?.label || "NEPSE"} Intraday</h3>
                            {chartStats && (
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-mono font-bold">
                                        {chartStats.close.toLocaleString(getNumberFormatLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span
                                        className={cn(
                                            "font-black px-1.5 py-0.5 rounded-md",
                                            chartStats.isPositive ? "bg-success/10 text-success" : "bg-error/10 text-error",
                                        )}
                                    >
                                        {chartStats.isPositive ? "+" : ""}{chartStats.change.toFixed(2)} ({chartStats.isPositive ? "+" : ""}{chartStats.changePerc.toFixed(2)}%)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-border/50 bg-muted/10 p-2 h-[200px]">
                            {isLoadingGraph ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : graphError ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <p className="text-xs text-muted-foreground">{graphError}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 h-7 text-xs"
                                        onClick={() => fetchSectorGraph(selectedSector)}
                                    >
                                        Retry
                                    </Button>
                                </div>
                            ) : chartData.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-xs text-muted-foreground">No intraday data available</p>
                                </div>
                            ) : (
                                (() => {
                                    const chartColor = chartStats?.isPositive ? "#10b981" : "#ef4444"
                                    const lineGradId = `sectorLineGrad-${selectedSector}`
                                    const fillGradId = `sectorFillGrad-${selectedSector}`
                                    return (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
                                                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.4} />
                                                        <stop offset="50%" stopColor={chartColor} stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor={chartColor} stopOpacity={1} />
                                                    </linearGradient>
                                                    <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                                                        <stop offset="100%" stopColor={chartColor} stopOpacity={0.005} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="time" hide />
                                                <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} hide />
                                                <Tooltip
                                                    content={({ active, payload, label }) => {
                                                        if (!active || !payload || payload.length === 0) return null
                                                        const value = payload[0]?.value as number | undefined
                                                        return (
                                                            <div
                                                                className="rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg px-2.5 py-1.5"
                                                                style={{ borderColor: `${chartColor}30` }}
                                                            >
                                                                <p className="text-[10px] font-bold text-muted-foreground/70">{label}</p>
                                                                <p className="text-xs font-black tracking-tight" style={{ color: chartColor }}>
                                                                    {typeof value === "number" ? value.toLocaleString(getNumberFormatLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
                                                                </p>
                                                            </div>
                                                        )
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="value" fill={`url(#${fillGradId})`} stroke="none" />
                                                <Line type="monotone" dataKey="value" stroke={`url(#${lineGradId})`} strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0, fill: chartColor }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )
                                })()
                            )}
                        </div>

                        {chartStats && (
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase">Open</p>
                                    <p className="text-xs font-mono font-black">{chartStats.open.toFixed(2)}</p>
                                </div>
                                <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase">High</p>
                                    <p className="text-xs font-mono font-black text-success">{chartStats.high.toFixed(2)}</p>
                                </div>
                                <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase">Low</p>
                                    <p className="text-xs font-mono font-black text-error">{chartStats.low.toFixed(2)}</p>
                                </div>
                                <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase">Last</p>
                                    <p className="text-[9px] text-muted-foreground/70">{chartStats.lastTime}</p>
                                    <p className="text-xs font-mono font-black">{chartStats.close.toFixed(2)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold">
                                Top Movers
                                {selectedSector !== "nepse" && (
                                    <span className="text-muted-foreground/70 font-bold ml-1">· {activeTabMeta?.label}</span>
                                )}
                            </h3>
                            <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
                                <button
                                    onClick={() => setMoversTab("gainers")}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all",
                                        moversTab === "gainers" ? "bg-success/10 text-success shadow-sm" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <TrendingUp className="w-3 h-3" /> Gainers
                                </button>
                                <button
                                    onClick={() => setMoversTab("losers")}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all",
                                        moversTab === "losers" ? "bg-error/10 text-error shadow-sm" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <TrendingDown className="w-3 h-3" /> Losers
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/50 overflow-hidden">
                            {!hasMovers ? (
                                <div className="py-8 text-center">
                                    <p className="text-xs text-muted-foreground">No mover data available for this sector</p>
                                </div>
                            ) : activeMovers.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        No {moversTab === "gainers" ? "gainers" : "losers"} data for this sector
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/30">
                                    {activeMovers.map((mover, idx) => {
                                        const isGainer = mover.percentageChange >= 0
                                        return (
                                            <button
                                                key={`${mover.symbol}-${idx}`}
                                                onClick={() => {
                                                    onOpenStockDetail?.(mover.symbol, mover.ltp, mover.pointChange, mover.percentageChange)
                                                    onOpenChange(false)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-muted/20",
                                                    !onOpenStockDetail && "cursor-default",
                                                )}
                                                disabled={!onOpenStockDetail}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-bold text-muted-foreground/60 w-4 text-right">{idx + 1}</span>
                                                    <span className="font-extrabold text-sm tracking-tight truncate">{mover.symbol}</span>
                                                    {onOpenStockDetail && (
                                                        <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-muted-foreground/80">
                                                        {mover.ltp.toLocaleString(getNumberFormatLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "text-[11px] font-black px-1.5 py-0.5 rounded-md min-w-[50px] text-center",
                                                            isGainer ? "bg-success/10 text-success" : "bg-error/10 text-error",
                                                        )}
                                                    >
                                                        {isGainer ? "+" : ""}{mover.percentageChange.toFixed(2)}%
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {selectedSector !== "nepse" && hasMovers && (
                            <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
                                Sector movers are filtered from NEPSE-wide top gainers/losers using sector classification.
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
