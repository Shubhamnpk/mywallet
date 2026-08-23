"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, X } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CalendarSystem, formatAppDate } from "@/lib/app-calendar"
import { useShareCurrency } from "@/hooks/use-share-currency"
import type { Portfolio } from "@/types/wallet"

export type PortfolioValuationPoint = {
    date: string
    value: number
    coveredSymbols: number
    points?: number
    snapshot?: Array<{
        symbol: string
        units: number
        ltp: number
        value: number
    }>
}

export type PortfolioValuationMeta = {
    symbolCount: number
    holdingCount: number
    missingSymbols: string[]
    investedValue: number
    liveValue: number
    mode: "transactions" | "current"
    selectedPortfolioIds: string[]
}

type ValuationTimelineModalState = {
    open: boolean
    title: string
    portfolioId?: string | null
}

export type ValuationTimelineRange = "1m" | "6m" | "1y" | "5y" | "all"
export type AggregationFrequency = "daily" | "weekly" | "monthly" | "yearly"

type ValuationTimelineModalProps = {
    calendarSystem: CalendarSystem
    currencySymbol: string
    isLoading: boolean
    progress: { loaded: number; total: number; currentSymbol: string } | null
    meta: PortfolioValuationMeta | null
    mode: "transactions" | "current"
    modal: ValuationTimelineModalState
    portfolioIds: string[]
    portfolioOptions: Portfolio[]
    range: ValuationTimelineRange
    timeline: PortfolioValuationPoint[]
    error: string | null
    formatAmount: (amount: number, isCrypto: boolean) => string
    onClose: () => void
    onModeChange: (mode: "transactions" | "current") => void
    onPortfolioIdsChange: (portfolioIds: string[]) => void
    onRangeChange: (range: ValuationTimelineRange) => void
    onViewPortfolio: (portfolioId: string) => void
}

const getRangeLabel = (range: ValuationTimelineRange) => range === "all" ? "All Time" : range.toUpperCase()

const VALUATION_TIMELINE_RANGES: Array<{ value: ValuationTimelineRange; label: string; grouping: "daily" | "weekly" | "monthly" }> = [
    { value: "1m", label: "1M", grouping: "daily" },
    { value: "6m", label: "6M", grouping: "weekly" },
    { value: "1y", label: "1Y", grouping: "weekly" },
    { value: "5y", label: "5Y", grouping: "monthly" },
    { value: "all", label: "All", grouping: "monthly" },
]

const FREQUENCY_OPTIONS: Array<{ value: AggregationFrequency; label: string }> = [
    { value: "daily", label: "1D" },
    { value: "weekly", label: "1W" },
    { value: "monthly", label: "1M" },
    { value: "yearly", label: "1Y" },
]

const getRangeConfig = (range: ValuationTimelineRange) =>
    VALUATION_TIMELINE_RANGES.find((option) => option.value === range) || VALUATION_TIMELINE_RANGES[0]

const getDateTime = (date: string) => {
    const parsed = Date.parse(`${date}T00:00:00Z`)
    return Number.isFinite(parsed) ? parsed : null
}

const getRangeCutoffTime = (latestDate: string, range: ValuationTimelineRange) => {
    if (range === "all") return null
    const latestTime = getDateTime(latestDate)
    if (latestTime === null) return null

    const cutoffDate = new Date(latestTime)
    if (range === "1m") cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - 1)
    if (range === "6m") cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - 6)
    if (range === "1y") cutoffDate.setUTCFullYear(cutoffDate.getUTCFullYear() - 1)
    if (range === "5y") cutoffDate.setUTCFullYear(cutoffDate.getUTCFullYear() - 5)
    return cutoffDate.getTime()
}

const getWeekKey = (date: Date) => {
    const firstDayOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
    const dayOfYear = Math.floor((date.getTime() - firstDayOfYear) / 86400000)
    return `${date.getUTCFullYear()}-W${Math.floor(dayOfYear / 7) + 1}`
}

const aggregateTimelinePoints = (points: PortfolioValuationPoint[], grouping: AggregationFrequency) => {
    if (grouping === "daily") return points

    const buckets = new Map<string, {
        date: string
        valueTotal: number
        coveredSymbolsTotal: number
        points: number
        snapshot?: PortfolioValuationPoint["snapshot"]
    }>()

    points.forEach((point) => {
        const parsed = new Date(`${point.date}T00:00:00Z`)
        if (Number.isNaN(parsed.getTime())) return
        const key = grouping === "yearly" ? point.date.slice(0, 4) : grouping === "monthly" ? point.date.slice(0, 7) : getWeekKey(parsed)
        const existing = buckets.get(key) || {
            date: point.date,
            valueTotal: 0,
            coveredSymbolsTotal: 0,
            points: 0,
            snapshot: undefined,
        }

        existing.date = point.date
        existing.valueTotal += point.value
        existing.coveredSymbolsTotal += point.coveredSymbols
        existing.points += 1
        existing.snapshot = point.snapshot
        buckets.set(key, existing)
    })

    return Array.from(buckets.values())
        .map((bucket) => ({
            date: bucket.date,
            value: bucket.points > 0 ? Number((bucket.valueTotal / bucket.points).toFixed(2)) : 0,
            coveredSymbols: bucket.points > 0 ? Math.round(bucket.coveredSymbolsTotal / bucket.points) : 0,
            points: bucket.points,
            snapshot: bucket.snapshot,
        }))
        .filter((point) => point.value > 0 && point.coveredSymbols > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
}

export function ValuationTimelineModal({
    calendarSystem,
    currencySymbol,
    isLoading,
    progress,
    meta,
    mode,
    modal,
    portfolioIds,
    portfolioOptions,
    range,
    timeline,
    error,
    formatAmount,
    onClose,
    onModeChange,
    onPortfolioIdsChange,
    onRangeChange,
    onViewPortfolio,
}: ValuationTimelineModalProps) {
    const [selectedSnapshotDate, setSelectedSnapshotDate] = useState<string | null>(null)
    const [frequency, setFrequency] = useState<AggregationFrequency>("daily")
    const { money: scMoney, moneySigned: scMoneySigned } = useShareCurrency()

    const rangeStats = useMemo(() => {
        const orderedTimeline = [...timeline].sort((a, b) => a.date.localeCompare(b.date))
        const latestPoint = orderedTimeline[orderedTimeline.length - 1]
        if (!latestPoint) return null

        const cutoffTime = getRangeCutoffTime(latestPoint.date, range)
        const rangedPoints = cutoffTime === null
            ? orderedTimeline
            : orderedTimeline.filter((point) => {
                const pointTime = getDateTime(point.date)
                return pointTime !== null && pointTime >= cutoffTime
            })
        const filteredPoints = rangedPoints.length > 0 ? rangedPoints : [latestPoint]
        const points = aggregateTimelinePoints(filteredPoints, frequency)

        const first = points[0]
        const latest = points[points.length - 1]
        const high = points.reduce((best, point) => point.value > best.value ? point : best, first)
        const low = points.reduce((best, point) => point.value < best.value ? point : best, first)
        const change = latest.value - first.value
        const changePercent = first.value > 0 ? (change / first.value) * 100 : 0
        const drawdownFromHigh = high.value > 0 ? ((latest.value - high.value) / high.value) * 100 : 0
        const averageValue = points.reduce((sum, point) => sum + point.value, 0) / points.length
        const periodMoves = points.slice(1).map((point, index) => {
            const previous = points[index]
            const valueChange = point.value - previous.value
            return {
                date: point.date,
                valueChange,
                percentChange: previous.value > 0 ? (valueChange / previous.value) * 100 : 0,
            }
        })
        const fallbackMove = { date: latest.date, valueChange: 0, percentChange: 0 }
        const bestMove = periodMoves.reduce((best, move) => move.valueChange > best.valueChange ? move : best, periodMoves[0] || fallbackMove)
        const worstMove = periodMoves.reduce((worst, move) => move.valueChange < worst.valueChange ? move : worst, periodMoves[0] || fallbackMove)

        return {
            first,
            latest,
            high,
            low,
            change,
            changePercent,
            drawdownFromHigh,
            averageValue,
            bestMove,
            worstMove,
            points,
            chartKey: `${range}-${frequency}-${first.date}-${latest.date}-${points.length}`,
        }
    }, [range, timeline, frequency])

    const selectedSnapshot = useMemo(() => {
        if (!rangeStats) return null
        const selectedPoint = selectedSnapshotDate
            ? rangeStats.points.find((point) => point.date === selectedSnapshotDate)
            : null
        return selectedPoint || null
    }, [rangeStats, selectedSnapshotDate])

    const allTimeStats = useMemo(() => {
        if (timeline.length === 0) return null
        const first = timeline[0]
        const latest = timeline[timeline.length - 1]
        const high = timeline.reduce((best, point) => point.value > best.value ? point : best, first)
        const low = timeline.reduce((best, point) => point.value < best.value ? point : best, first)
        return {
            high,
            low,
            drawdownFromHigh: high.value > 0 ? ((latest.value - high.value) / high.value) * 100 : 0,
        }
    }, [timeline])

    useEffect(() => {
        if (!modal.open || typeof document === "undefined") return
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => {
            document.body.style.overflow = originalOverflow
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [modal.open, onClose])

    if (!modal.open) return null

    const money = (amount: number) => scMoney(amount)
    const signedMoney = (amount: number) => {
        const sign = amount > 0 ? "+" : amount < 0 ? "-" : ""
        return `${sign}${scMoneySigned(Math.abs(amount))}`
    }
    const handleChartClick = (chartState: unknown) => {
        const payload = (chartState as { activePayload?: Array<{ payload?: PortfolioValuationPoint }> })?.activePayload?.[0]?.payload
        if (payload?.date) {
            setSelectedSnapshotDate(payload.date)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[80] flex h-[100dvh] flex-col overflow-x-hidden bg-background text-foreground"
            role="dialog"
            aria-modal="true"
            aria-labelledby="valuation-timeline-title"
        >
            <div className="border-b border-muted/20 bg-background/95 px-4 pt-4 pb-3 backdrop-blur sm:px-6 lg:px-8 shrink-0">
                <button
                    type="button"
                    className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-muted-foreground/15 bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onClick={onClose}
                    aria-label="Close valuation timeline"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col gap-3 pr-8 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 id="valuation-timeline-title" className="text-lg font-black sm:text-xl">
                            {modal.title || "Valuation Timeline"}
                        </h2>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                            Portfolio value reconstructed from the LTP history archive.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-lg border border-muted/30 bg-muted/10 p-1">
                            <Button type="button" size="sm" variant={mode === "transactions" ? "default" : "ghost"} className="h-7 rounded-md px-2 text-[10px] font-black uppercase tracking-widest" onClick={() => onModeChange("transactions")}>
                                Actual
                            </Button>
                            <Button type="button" size="sm" variant={mode === "current" ? "default" : "ghost"} className="h-7 rounded-md px-2 text-[10px] font-black uppercase tracking-widest" onClick={() => onModeChange("current")}>
                                Current
                            </Button>
                        </div>
                        <Select value={frequency} onValueChange={(v) => setFrequency(v as AggregationFrequency)}>
                            <SelectTrigger size="sm" className="h-7 w-[62px] rounded-lg border-muted/30 text-[10px] font-black uppercase tracking-widest">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FREQUENCY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value} className="text-[10px] font-black uppercase tracking-widest">
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex rounded-lg border border-muted/30 bg-muted/10 p-1">
                            {VALUATION_TIMELINE_RANGES.map((rangeOption) => (
                                <Button key={rangeOption.value} type="button" size="sm" variant={range === rangeOption.value ? "default" : "ghost"} className="h-7 rounded-md px-2 text-[10px] font-black uppercase tracking-widest" onClick={() => onRangeChange(rangeOption.value)}>
                                    {rangeOption.label}
                                </Button>
                            ))}
                        </div>
                        {rangeStats && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest",
                                    rangeStats.change >= 0 ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error",
                                )}
                            >
                                {rangeStats.change >= 0 ? "+" : ""}{rangeStats.changePercent.toFixed(2)}%
                            </Badge>
                        )}
                    </div>
                </div>

                {!modal.portfolioId && portfolioOptions.length > 0 && (
                    <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {portfolioOptions.map((entry) => {
                                const isSelected = portfolioIds.includes(entry.id)
                                return (
                                    <div
                                        key={entry.id}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors",
                                            isSelected ? "border-primary/30 bg-primary/10 text-primary" : "border-muted/30 bg-muted/10 text-muted-foreground",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            className="max-w-[150px] truncate"
                                            onClick={() => {
                                                const next = isSelected
                                                    ? portfolioIds.filter((id) => id !== entry.id)
                                                    : Array.from(new Set([...portfolioIds, entry.id]))
                                                onPortfolioIdsChange(next)
                                            }}
                                            title={isSelected ? "Remove from timeline" : "Add to timeline"}
                                        >
                                            {entry.name}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {portfolioIds.length} of {portfolioOptions.length} portfolio{portfolioOptions.length === 1 ? "" : "s"} selected
                        </p>
                    </div>
                )}
            </div>

            <ScrollArea className="min-h-0 flex-1">
                <div className="w-full space-y-3 p-3 sm:space-y-4 sm:p-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex h-[clamp(220px,40vh,550px)] items-center justify-center rounded-xl border border-muted/30 bg-muted/10">
                            <div className="flex flex-col items-center gap-3 text-sm font-bold text-muted-foreground">
                                <Activity className="h-5 w-5 animate-spin" />
                                <div className="text-center">
                                    {progress && progress.total > 0 ? (
                                        <>
                                            <p>Loading {progress.total} symbols...</p>
                                            {progress.currentSymbol && (
                                                <p className="mt-1 text-[11px] font-mono font-normal text-muted-foreground/70">
                                                    {progress.loaded} / {progress.total} &middot; {progress.currentSymbol}
                                                </p>
                                            )}
                                            <div className="mx-auto mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-muted/30">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all duration-300"
                                                    style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <p>Building valuation timeline...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{error}</p>
                        </div>
                    ) : rangeStats ? (
                        <>
                            <div className="pb-1">
                                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-8 lg:gap-2">
                                    <StatusMetric label="Latest" value={money(rangeStats.latest.value)} detail={formatAppDate(rangeStats.latest.date, calendarSystem)} tone="primary" />
                                    <StatusMetric label="Move" value={signedMoney(rangeStats.change)} detail={`${rangeStats.change >= 0 ? "+" : ""}${rangeStats.changePercent.toFixed(2)}%`} tone={rangeStats.change >= 0 ? "success" : "error"} />
                                    <StatusMetric label="Average" value={money(rangeStats.averageValue)} detail={`${rangeStats.points.length} point${rangeStats.points.length === 1 ? "" : "s"}`} />
                                    <StatusMetric label="Range High" value={money(rangeStats.high.value)} detail={formatAppDate(rangeStats.high.date, calendarSystem)} tone="success" />
                                    <StatusMetric label="Range Low" value={money(rangeStats.low.value)} detail={formatAppDate(rangeStats.low.date, calendarSystem)} tone="error" />
                                    <StatusMetric label="Drawdown" value={`${rangeStats.drawdownFromHigh.toFixed(2)}%`} detail="From range high" tone="warning" />
                                    <StatusMetric label={`Best ${frequency === "daily" ? "Day" : "Move"}`} value={signedMoney(Math.max(rangeStats.bestMove.valueChange, 0))} detail={rangeStats.bestMove.percentChange.toFixed(2) + "%"} tone="success" />
                                    <StatusMetric label={`Worst ${frequency === "daily" ? "Day" : "Move"}`} value={signedMoney(rangeStats.worstMove.valueChange)} detail={rangeStats.worstMove.percentChange.toFixed(2) + "%"} tone="error" />
                                </div>
                            </div>

                            {allTimeStats && (
                                <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 sm:p-4">
                                    <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Business Read</p>
                                            <p className="mt-1 text-xs font-semibold text-foreground sm:text-sm">
                                                {allTimeStats.drawdownFromHigh >= -1
                                                    ? "Near recorded valuation high."
                                                    : allTimeStats.drawdownFromHigh <= -15
                                                        ? "Meaningfully below recorded valuation high."
                                                        : "Below recorded high but within moderate range."}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <MiniReadout label="ATH Gap" value={`${allTimeStats.drawdownFromHigh.toFixed(2)}%`} />
                                            <MiniReadout label="Range" value={getRangeLabel(range)} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="h-[clamp(220px,40vh,550px)] shrink-0 rounded-xl border border-primary/10 bg-background/60 p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart key={rangeStats.chartKey} data={rangeStats.points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} onClick={handleChartClick}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10 }}
                                            minTickGap={24}
                                            tickFormatter={(value) => {
                                                const parsed = new Date(`${value}T00:00:00Z`)
                                                return Number.isNaN(parsed.getTime())
                                                    ? String(value)
                                                    : frequency === "yearly"
                                                        ? formatAppDate(parsed, calendarSystem, { year: "numeric", timeZone: "UTC" })
                                                        : frequency === "monthly"
                                                            ? formatAppDate(parsed, calendarSystem, { month: "short", year: "2-digit", timeZone: "UTC" })
                                                            : formatAppDate(parsed, calendarSystem, { month: "short", day: "numeric", timeZone: "UTC" })
                                            }}
                                        />
                                        <YAxis tick={{ fontSize: 10 }} width={48} domain={["auto", "auto"]} tickFormatter={(value) => `${Number(value) >= 100000 ? `${(Number(value) / 100000).toFixed(1)}L` : Number(value).toFixed(0)}`} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload || payload.length === 0) return null
                                                const row = payload[0]?.payload as PortfolioValuationPoint | undefined
                                                const value = Number(payload[0]?.value || 0)
                                                return (
                                                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
                                                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                            {(() => {
                                                                const parsed = new Date(`${label}T00:00:00Z`)
                                                                return Number.isNaN(parsed.getTime())
                                                                    ? String(label)
                                                                    : frequency === "yearly"
                                                                        ? formatAppDate(parsed, calendarSystem, { year: "numeric", timeZone: "UTC" })
                                                                        : frequency === "monthly"
                                                                            ? formatAppDate(parsed, calendarSystem, { month: "long", year: "numeric", timeZone: "UTC" })
                                                                            : formatAppDate(parsed, calendarSystem, { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" })
                                                            })()}
                                                        </p>
                                                        <p className="text-xs font-bold text-primary">{frequency === "daily" ? "Value" : "Avg Value"}: {money(value)}</p>
                                                        {row?.points && row.points > 1 && <p className="text-[10px] font-bold text-muted-foreground">Averaged from {row.points} daily valuation{row.points === 1 ? "" : "s"}</p>}
                                                        {row && <p className="text-[10px] font-bold text-muted-foreground">{row.coveredSymbols} symbol{row.coveredSymbols === 1 ? "" : "s"} priced</p>}
                                                    </div>
                                                )
                                            }}
                                        />
                                        <Line type="monotone" dataKey="value" name="Valuation" stroke="#f97316" strokeWidth={3} dot={frequency !== "daily"} activeDot={{ r: 4, strokeWidth: 0, fill: "#f97316" }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {selectedSnapshot?.snapshot?.length ? (
                                <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 sm:p-4">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Time Snapshot</p>
                                            <p className="mt-1 text-sm font-black">
                                                {formatAppDate(selectedSnapshot.date, calendarSystem)} • {money(selectedSnapshot.value)}
                                            </p>
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            {selectedSnapshot.snapshot.length} priced symbol{selectedSnapshot.snapshot.length === 1 ? "" : "s"}
                                        </p>
                                    </div>
                                    <div className="mt-3 divide-y divide-muted/20 rounded-lg border border-muted/30 bg-background/70">
                                        {selectedSnapshot.snapshot.map((entry) => (
                                            <div key={entry.symbol} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs sm:grid sm:grid-cols-[1fr_1fr_1fr_1.2fr] sm:gap-3">
                                                <p className="w-full font-black uppercase tracking-wider text-foreground sm:w-auto">{entry.symbol}</p>
                                                <p className="font-mono font-bold text-muted-foreground">{entry.units.toLocaleString(undefined, { maximumFractionDigits: 4 })} units</p>
                                                <p className="font-mono font-bold text-muted-foreground">LTP {money(entry.ltp)}</p>
                                                <p className="font-mono font-black text-primary sm:text-right">{money(entry.value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : selectedSnapshot ? (
                                <div className="rounded-xl border border-muted/30 bg-muted/10 p-3 sm:p-4">
                                    <p className="text-xs font-bold text-muted-foreground">No symbol-level price snapshot is available for this point.</p>
                                </div>
                            ) : null}

                            {meta && (
                                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
                                    <InfoCard label="Coverage" value={`${meta.symbolCount - meta.missingSymbols.length}/${meta.symbolCount} symbols`} detail={`${meta.holdingCount} active holding${meta.holdingCount === 1 ? "" : "s"}`} />
                                    <InfoCard label="Cost Basis" value={money(meta.investedValue)} detail="Current active holding cost basis." />
                                    <InfoCard label="Timeline Mode" value={mode === "transactions" ? "Actual" : "Current"} detail={mode === "transactions" ? "Uses transaction dates and changing units." : "Projects current holdings across LTP history."} />
                                </div>
                            )}

                            {meta?.missingSymbols.length ? (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Missing LTP History</p>
                                    <p className="mt-1 break-words text-xs font-medium text-muted-foreground">
                                        {meta.missingSymbols.slice(0, 12).join(", ")}
                                        {meta.missingSymbols.length > 12 ? ` +${meta.missingSymbols.length - 12} more` : ""}
                                    </p>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </ScrollArea>
        </div>
    )
}

function StatusMetric({ label, value, detail, tone = "muted" }: { label: string; value: string; detail: string; tone?: "primary" | "success" | "error" | "warning" | "muted" }) {
    const toneClass = {
        primary: "border-primary/20 bg-primary/5 text-primary",
        success: "border-success/20 bg-success/[0.04] text-success",
        error: "border-error/20 bg-error/[0.04] text-error",
        warning: "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300",
        muted: "border-muted/30 bg-muted/10 text-foreground",
    }[tone]

    return (
        <div className={cn("min-w-0 rounded-lg border px-1.5 py-1 sm:px-3 sm:py-2", toneClass)}>
            <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground sm:text-[9px]">{label}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] font-black sm:mt-1 sm:text-sm" title={value}>{value}</p>
            <p className="mt-0 truncate text-[8px] font-bold text-muted-foreground sm:mt-0.5 sm:text-[10px]" title={detail}>{detail}</p>
        </div>
    )
}

function MiniReadout({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-muted/30 bg-background/60 px-2 py-1 sm:px-3 sm:py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground sm:text-[9px]">{label}</p>
            <p className="text-[11px] font-black font-mono sm:text-sm">{value}</p>
        </div>
    )
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded-xl border border-muted/30 bg-muted/10 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-black font-mono">{value}</p>
            <p className="mt-1 text-[10px] font-bold text-muted-foreground">{detail}</p>
        </div>
    )
}
