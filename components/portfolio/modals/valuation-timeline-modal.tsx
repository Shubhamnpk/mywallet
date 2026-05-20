"use client"

import { useEffect, useMemo } from "react"
import { Activity, Eye, X } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { CalendarSystem, formatAppDate } from "@/lib/app-calendar"
import type { Portfolio } from "@/types/wallet"

export type PortfolioValuationPoint = {
    date: string
    value: number
    coveredSymbols: number
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

type ValuationTimelineRange = "1m" | "3m" | "6m" | "1y" | "all"

type ValuationTimelineModalProps = {
    calendarSystem: CalendarSystem
    currencySymbol: string
    isLoading: boolean
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
    if (range === "3m") cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - 3)
    if (range === "6m") cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - 6)
    if (range === "1y") cutoffDate.setUTCFullYear(cutoffDate.getUTCFullYear() - 1)
    return cutoffDate.getTime()
}

export function ValuationTimelineModal({
    calendarSystem,
    currencySymbol,
    isLoading,
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
        const points = rangedPoints.length > 0 ? rangedPoints : [latestPoint]

        const first = points[0]
        const latest = points[points.length - 1]
        const high = points.reduce((best, point) => point.value > best.value ? point : best, first)
        const low = points.reduce((best, point) => point.value < best.value ? point : best, first)
        const change = latest.value - first.value
        const changePercent = first.value > 0 ? (change / first.value) * 100 : 0
        const drawdownFromHigh = high.value > 0 ? ((latest.value - high.value) / high.value) * 100 : 0
        const averageValue = points.reduce((sum, point) => sum + point.value, 0) / points.length
        const dailyMoves = points.slice(1).map((point, index) => {
            const previous = points[index]
            const valueChange = point.value - previous.value
            return {
                date: point.date,
                valueChange,
                percentChange: previous.value > 0 ? (valueChange / previous.value) * 100 : 0,
            }
        })
        const fallbackMove = { date: latest.date, valueChange: 0, percentChange: 0 }
        const bestDay = dailyMoves.reduce((best, move) => move.valueChange > best.valueChange ? move : best, dailyMoves[0] || fallbackMove)
        const worstDay = dailyMoves.reduce((worst, move) => move.valueChange < worst.valueChange ? move : worst, dailyMoves[0] || fallbackMove)

        return {
            first,
            latest,
            high,
            low,
            change,
            changePercent,
            drawdownFromHigh,
            averageValue,
            bestDay,
            worstDay,
            points,
            chartKey: `${range}-${first.date}-${latest.date}-${points.length}`,
        }
    }, [range, timeline])

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

    const money = (amount: number) => `${currencySymbol.trim() || "Rs."} ${formatAmount(amount, false)}`

    return (
        <div
            className="fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col overflow-hidden bg-background text-foreground"
            role="dialog"
            aria-modal="true"
            aria-labelledby="valuation-timeline-title"
        >
            <div className="border-b border-muted/20 bg-background/95 px-4 pt-4 pb-3 backdrop-blur sm:px-6">
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
                        <div className="flex rounded-lg border border-muted/30 bg-muted/10 p-1">
                            {(["1m", "3m", "6m", "1y", "all"] as const).map((nextRange) => (
                                <Button key={nextRange} type="button" size="sm" variant={range === nextRange ? "default" : "ghost"} className="h-7 rounded-md px-2 text-[10px] font-black uppercase tracking-widest" onClick={() => onRangeChange(nextRange)}>
                                    {nextRange === "all" ? "All" : nextRange.toUpperCase()}
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
                                        <button
                                            type="button"
                                            className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-primary"
                                            title="See portfolio details"
                                            onClick={() => onViewPortfolio(entry.id)}
                                        >
                                            <Eye className="h-3 w-3" />
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
                <div className="space-y-4 p-5 sm:p-6">
                    {isLoading ? (
                        <div className="flex h-[55vh] min-h-[360px] items-center justify-center rounded-xl border border-muted/30 bg-muted/10">
                            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                <Activity className="h-4 w-4 animate-spin" />
                                Building valuation timeline...
                            </div>
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{error}</p>
                        </div>
                    ) : rangeStats ? (
                        <>
                            <div className="overflow-x-auto pb-1">
                                <div className="grid min-w-[1120px] grid-cols-8 gap-2">
                                    <StatusMetric label="Latest" value={money(rangeStats.latest.value)} detail={formatAppDate(rangeStats.latest.date, calendarSystem)} tone="primary" />
                                    <StatusMetric label="Move" value={`${rangeStats.change >= 0 ? "+" : ""}${money(rangeStats.change)}`} detail={`${rangeStats.change >= 0 ? "+" : ""}${rangeStats.changePercent.toFixed(2)}%`} tone={rangeStats.change >= 0 ? "success" : "error"} />
                                    <StatusMetric label="Average" value={money(rangeStats.averageValue)} detail={`${rangeStats.points.length} point${rangeStats.points.length === 1 ? "" : "s"}`} />
                                    <StatusMetric label="Range High" value={money(rangeStats.high.value)} detail={formatAppDate(rangeStats.high.date, calendarSystem)} tone="success" />
                                    <StatusMetric label="Range Low" value={money(rangeStats.low.value)} detail={formatAppDate(rangeStats.low.date, calendarSystem)} tone="error" />
                                    <StatusMetric label="Drawdown" value={`${rangeStats.drawdownFromHigh.toFixed(2)}%`} detail="From range high" tone="warning" />
                                    <StatusMetric label="Best Day" value={`+${money(Math.max(rangeStats.bestDay.valueChange, 0))}`} detail={rangeStats.bestDay.percentChange.toFixed(2) + "%"} tone="success" />
                                    <StatusMetric label="Worst Day" value={money(rangeStats.worstDay.valueChange)} detail={rangeStats.worstDay.percentChange.toFixed(2) + "%"} tone="error" />
                                </div>
                            </div>

                            {allTimeStats && (
                                <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Business Read</p>
                                            <p className="mt-1 text-sm font-semibold text-foreground">
                                                {allTimeStats.drawdownFromHigh >= -1
                                                    ? "Portfolio is trading near its recorded valuation high."
                                                    : allTimeStats.drawdownFromHigh <= -15
                                                        ? "Portfolio is meaningfully below its recorded valuation high."
                                                        : "Portfolio is below its recorded high but still within a moderate range."}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-right sm:flex sm:items-center">
                                            <MiniReadout label="ATH Gap" value={`${allTimeStats.drawdownFromHigh.toFixed(2)}%`} />
                                            <MiniReadout label="Range" value={getRangeLabel(range)} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="h-[52vh] min-h-[360px] rounded-xl border border-primary/10 bg-background/60 p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart key={rangeStats.chartKey} data={rangeStats.points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10 }}
                                            minTickGap={28}
                                            tickFormatter={(value) => {
                                                const parsed = new Date(`${value}T00:00:00Z`)
                                                return Number.isNaN(parsed.getTime()) ? String(value) : formatAppDate(parsed, calendarSystem, { month: "short", day: "numeric", timeZone: "UTC" })
                                            }}
                                        />
                                        <YAxis tick={{ fontSize: 10 }} width={64} domain={["auto", "auto"]} tickFormatter={(value) => `${Number(value) >= 100000 ? `${(Number(value) / 100000).toFixed(1)}L` : Number(value).toFixed(0)}`} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload || payload.length === 0) return null
                                                const row = payload[0]?.payload as PortfolioValuationPoint | undefined
                                                const value = Number(payload[0]?.value || 0)
                                                return (
                                                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
                                                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{formatAppDate(String(label), calendarSystem)}</p>
                                                        <p className="text-xs font-bold text-primary">Value: {money(value)}</p>
                                                        {row && <p className="text-[10px] font-bold text-muted-foreground">{row.coveredSymbols} symbol{row.coveredSymbols === 1 ? "" : "s"} priced</p>}
                                                    </div>
                                                )
                                            }}
                                        />
                                        <Line type="monotone" dataKey="value" name="Valuation" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#f97316" }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

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
                                    <p className="mt-1 text-xs font-medium text-muted-foreground">
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
        <div className={cn("min-w-0 rounded-lg border px-3 py-2", toneClass)}>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-1 truncate font-mono text-sm font-black" title={value}>{value}</p>
            <p className="mt-0.5 truncate text-[10px] font-bold text-muted-foreground" title={detail}>{detail}</p>
        </div>
    )
}

function MiniReadout({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-muted/30 bg-background/60 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-sm font-black font-mono">{value}</p>
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
