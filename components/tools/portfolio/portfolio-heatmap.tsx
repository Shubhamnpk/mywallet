"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LayoutGrid, X, Search, Info, Filter, PieChart, Eye, Activity } from "lucide-react"
import type { PortfolioItem } from "@/types/wallet"
import { useShareCurrency } from "@/hooks/use-share-currency"

type SizeMode = "allocation" | "units" | "return"
type ColorMode = "daily" | "total"
type AssetFilter = "all" | "stock" | "crypto"

interface HeatMapItem {
  symbol: string
  assetName?: string
  currentValue: number
  changePercent: number
  absChange: number
  isPositive: boolean
  assetType?: string
  totalUnits: number
  totalCost: number
  hasValidCost: boolean
  returnAmount: number
  returnPercent: number
  ltp: number
}

interface PortfolioHeatMapProps {
  portfolio: PortfolioItem[]
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

function HeatMapContent({
  items,
  sizeMode,
  colorMode,
  searchQuery,
  selectedItem,
  setSelectedItem,
  heightClass,
}: {
  items: HeatMapItem[]
  sizeMode: SizeMode
  colorMode: ColorMode
  searchQuery: string
  selectedItem: HeatMapItem | null
  setSelectedItem: (item: HeatMapItem | null) => void
  heightClass: string
}) {
  const { money, moneySigned } = useShareCurrency()
  const maxAbsChange = useMemo(() => {
    return items.length > 0 ? Math.max(...items.map(i => i.absChange), 1) : 1
  }, [items])

  const maxReturnPercent = useMemo(() => {
    return items.length > 0 ? Math.max(...items.map(i => Math.abs(i.returnPercent)), 1) : 1
  }, [items])

  const sizingKey = sizeMode === "allocation" ? "currentValue" : sizeMode === "units" ? "totalUnits" : "returnAmount"

  const totalSize = useMemo(() => {
    return items.reduce((s, i) => s + Math.abs(i[sizingKey]), 0) || 1
  }, [items, sizingKey])

  const rects = useMemo(() => {
    const indexed = items
      .map((item, i) => ({ value: Math.abs(item[sizingKey]) / totalSize, index: i }))
      .sort((a, b) => b.value - a.value)

    const result: ({ x: number; y: number; w: number; h: number; index: number })[] = []

    function squarify(
      entries: { value: number; index: number }[],
      rect: { x: number; y: number; w: number; h: number },
      res: { x: number; y: number; w: number; h: number; index: number }[]
    ) {
      if (entries.length === 0) return
      const totalValue = entries.reduce((s, e) => s + e.value, 0)
      if (totalValue === 0) {
        for (const e of entries) res.push({ x: 0, y: 0, w: 0, h: 0, index: e.index })
        return
      }

      const row: typeof entries = []
      let rowValue = 0
      let bestAspect = Infinity
      const isVertical = rect.w >= rect.h

      for (let i = 0; i < entries.length; i++) {
        const candidate = [...row, entries[i]]
        const cv = candidate.reduce((s, e) => s + e.value, 0)
        const frac = cv / totalValue
        const rowSize = isVertical
          ? (frac * rect.w * rect.h) / rect.h
          : (frac * rect.w * rect.h) / rect.w

        const aspects = candidate.map(e => {
          const c = isVertical
            ? (e.value / cv) * rect.w / rowSize
            : (e.value / cv) * rect.h / rowSize
          return Math.max(c, 1 / c)
        })
        const worst = Math.max(...aspects)
        if (worst < bestAspect) {
          bestAspect = worst
          row.push(entries[i])
          rowValue = cv
        } else {
          break
        }
      }

      const remaining = entries.slice(row.length)
      const frac = rowValue / totalValue
      let rowW: number, rowH: number, rowX: number, rowY: number
      if (isVertical) {
        rowW = frac * rect.w
        rowH = rect.h
        rowX = rect.x
        rowY = rect.y
      } else {
        rowW = rect.w
        rowH = frac * rect.h
        rowX = rect.x
        rowY = rect.y
      }

      const rowTotal = row.reduce((s, e) => s + e.value, 0) || 1
      let acc = 0
      for (const e of row) {
        const f = e.value / rowTotal
        if (isVertical) {
          res.push({ x: rowX, y: rowY + acc * rowH, w: rowW, h: f * rowH, index: e.index })
          acc += f
        } else {
          res.push({ x: rowX + acc * rowW, y: rowY, w: f * rowW, h: rowH, index: e.index })
          acc += f
        }
      }

      const remainingRect = isVertical
        ? { x: rect.x + rowW, y: rect.y, w: Math.max(0, rect.w - rowW), h: rect.h }
        : { x: rect.x, y: rect.y + rowH, w: rect.w, h: Math.max(0, rect.h - rowH) }

      squarify(remaining, remainingRect, res)
    }

    squarify(indexed, { x: 0, y: 0, w: 100, h: 100 }, result)
    return result.sort((a, b) => a.index - b.index)
  }, [items, sizingKey, totalSize])

  const gap = 0.6

  return (
    <div className={`rounded-xl border border-border/40 bg-muted/5 relative overflow-hidden transition-all duration-300 w-full ${heightClass}`}>
      {items.map((item, idx) => {
        const r = rects[idx]
        if (!r || r.w <= 0 || r.h <= 0) return null

        const displayPct = colorMode === "daily" ? item.changePercent : item.returnPercent
        const noCostData = colorMode === "total" && !item.hasValidCost

        const modeMaxAbsChange = colorMode === "daily" ? maxAbsChange : maxReturnPercent
        const intensity = Math.min(Math.abs(displayPct) / (modeMaxAbsChange || 1), 1)

        const grayRGB = "148, 163, 184"
        const isNeutral = noCostData || (colorMode === "total" && displayPct === 0)

        let rgb: string, alpha: number, sign: string
        if (isNeutral) {
          rgb = grayRGB
          alpha = 0.12
          sign = ""
        } else {
          const isPositive = displayPct > 0
          rgb = isPositive ? "34, 197, 94" : "239, 68, 68"
          alpha = 0.15 + intensity * 0.75
          sign = isPositive ? "+" : ""
        }
        const bgColor = `rgba(${rgb}, ${alpha})`

        // Sizing & visibility logic
        const cellArea = r.w * r.h
        const showLabel = cellArea > 12 && r.w > 6 && r.h > 6
        const showValue = cellArea > 35 && r.w > 8 && r.h > 8
        const fontSize = Math.max(9, Math.min(22, Math.sqrt(cellArea * 0.18)))

        const isHighlighted = searchQuery
          ? item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
          : false

        const isSelected = selectedItem?.symbol === item.symbol

        // Classes based on search/highlight state
        const opacityClass = searchQuery && !isHighlighted ? "opacity-30 scale-[0.98] saturate-50 blur-[0.3px]" : "opacity-100"
        const highlightRing = isHighlighted
          ? "ring-2 ring-primary ring-offset-1 z-20 scale-[1.02] shadow-[0_0_15px_oklch(var(--primary)/0.6)] animate-pulse"
          : isSelected
            ? "ring-2 ring-foreground scale-[1.01] z-20 shadow-md"
            : ""

        // Contrast/Accessibility handling for light/dark modes
        const isDarkText = intensity <= 0.6
        const textClass = isNeutral ? "text-zinc-400 dark:text-zinc-600" : isDarkText ? "text-zinc-950 dark:text-white" : "text-white"
        const subtextClass = isNeutral ? "text-zinc-400 dark:text-zinc-600" : isDarkText ? "text-zinc-700 dark:text-white/80" : "text-white/90"
        const textShadowStyle = isNeutral ? undefined : isDarkText ? undefined : { textShadow: "0 1px 2px rgba(0,0,0,0.5)" }

        const cellContent = (
          <div
            onClick={() => setSelectedItem(selectedItem?.symbol === item.symbol ? null : item)}
            className={`flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden rounded-md border border-white/10 dark:border-black/25 shadow-sm transition-all duration-300 ease-in-out hover:brightness-110 active:scale-[0.98] group ${opacityClass} ${highlightRing}`}
            style={{
              position: 'absolute',
              left: `${r.x + gap}%`,
              top: `${r.y + gap}%`,
              width: `${r.w - 2 * gap}%`,
              height: `${r.h - 2 * gap}%`,
              backgroundColor: bgColor,
            }}
          >
            {showLabel ? (
              <div className="flex flex-col items-center justify-center px-1 max-w-full">
                <span
                  className={`font-black tracking-tight leading-none truncate max-w-full transition-colors duration-200 ${textClass}`}
                  style={{ fontSize: `${fontSize}px`, ...textShadowStyle }}
                >
                  {item.symbol}
                </span>
                {showValue && (
                  <span
                    className={`font-bold mt-1 transition-colors duration-200 ${subtextClass}`}
                    style={{ fontSize: `${Math.max(7, fontSize * 0.72)}px`, ...textShadowStyle }}
                  >
                    {sign}{displayPct.toFixed(1)}%
                  </span>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-background/90 transition-opacity duration-200">
                <span className="font-black text-[9px] text-foreground tracking-tighter">
                  {item.symbol}
                </span>
              </div>
            )}
          </div>
        )

        return (
          <TooltipProvider key={item.symbol}>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                {cellContent}
              </TooltipTrigger>
              <TooltipContent
                className="p-3 bg-card/95 backdrop-blur-md border border-border text-foreground shadow-2xl rounded-xl max-w-xs space-y-2 animate-in fade-in-50 z-50"
                sideOffset={6}
                avoidCollisions={true}
                collisionPadding={12}
              >
                <div className="flex flex-col border-b border-border/50 pb-1.5 gap-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-black text-xs uppercase tracking-wider">{item.symbol}</span>
                    <Badge variant="secondary" className="text-[9px] uppercase tracking-wider h-4 px-1 bg-primary/10 text-primary">
                      {item.assetType === 'crypto' ? 'Crypto' : 'Stock'}
                    </Badge>
                  </div>
                  {item.assetName && (
                    <span className="text-[9px] text-muted-foreground font-medium truncate">{item.assetName}</span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11px] font-semibold text-muted-foreground">
                  <div className="flex justify-between gap-6">
                    <span>Current Value:</span>
                    <span className="font-bold text-foreground">{money(item.currentValue)}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span>Units Held:</span>
                    <span className="font-bold text-foreground">{item.totalUnits}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span>Avg Purchase Cost:</span>
                    <span className="font-bold text-foreground">
                      {item.hasValidCost ? `${money(item.totalCost / item.totalUnits, { maximumFractionDigits: 2 })}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-6 border-t border-border/20 pt-1 mt-1">
                    <span>Daily Change:</span>
                    <span className={`font-bold ${item.changePercent >= 0 ? 'text-success' : 'text-error'}`}>
                      {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span>LTP:</span>
                    <span className="font-bold text-foreground">{money(item.ltp, { maximumFractionDigits: 2 })}</span>
                  </div>
                  {item.hasValidCost ? (
                    <div className="flex justify-between gap-6">
                      <span>Total Return:</span>
                      <span className={`font-bold ${item.returnAmount >= 0 ? 'text-success' : 'text-error'}`}>
                        {item.returnAmount >= 0 ? '+' : ''}{moneySigned(item.returnAmount, { maximumFractionDigits: 2 })} ({item.returnPercent >= 0 ? '+' : ''}{item.returnPercent.toFixed(2)}%)
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-6">
                      <span>Total Return:</span>
                      <span className="font-bold text-muted-foreground/60">- (no cost data)</span>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )
}

export function PortfolioHeatMap({ portfolio }: PortfolioHeatMapProps) {
  const { money, moneySigned } = useShareCurrency()
  const [sizeMode, setSizeMode] = useState<SizeMode>("allocation")
  const [colorMode, setColorMode] = useState<ColorMode>("daily")
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showInfo, setShowInfo] = useState(false)
  const [selectedItem, setSelectedItem] = useState<HeatMapItem | null>(null)

  const rawHeatMapItems = useMemo(() => {
    // Group portfolio items by symbol, skip zero/kept-zero holdings and items without a live price
    const grouped = new Map<string, {
      totalUnits: number
      totalCost: number
      costUnitCount: number   // units that have a real buy price (> 0)
      totalCurrentValue: number
      weightedPctChangeSum: number
      weightedPctChangeUnits: number
      ltp: number
      assetType?: string
      assetName?: string
    }>()

    for (const item of portfolio) {
      if (item.isKeptZeroHolding) continue
      if (item.units <= 0) continue
      if (!isFiniteNumber(item.currentPrice) || item.currentPrice! <= 0) continue

      const price = item.currentPrice!
      const currentValue = item.units * price
      const hasBuyPrice = isFiniteNumber(item.buyPrice) && item.buyPrice > 0
      const cost = hasBuyPrice ? item.units * item.buyPrice : 0

      const existing = grouped.get(item.symbol)
      if (existing) {
        existing.totalUnits += item.units
        existing.totalCost += cost
        if (hasBuyPrice) existing.costUnitCount += item.units
        existing.totalCurrentValue += currentValue
        existing.ltp = price
        // Weighted by current value so larger holdings drive the daily % more
        if (isFiniteNumber(item.percentChange)) {
          existing.weightedPctChangeSum += item.percentChange! * currentValue
          existing.weightedPctChangeUnits += currentValue
        }
        // Prefer the most-recently-set assetName/assetType
        if (item.assetType) existing.assetType = item.assetType
        if (item.assetName) existing.assetName = item.assetName
      } else {
        grouped.set(item.symbol, {
          totalUnits: item.units,
          totalCost: cost,
          costUnitCount: hasBuyPrice ? item.units : 0,
          totalCurrentValue: currentValue,
          weightedPctChangeSum: isFiniteNumber(item.percentChange) ? item.percentChange! * currentValue : 0,
          weightedPctChangeUnits: isFiniteNumber(item.percentChange) ? currentValue : 0,
          ltp: price,
          assetType: item.assetType,
          assetName: item.assetName,
        })
      }
    }

    return Array.from(grouped.entries()).map(([symbol, data]) => {
      const pctChange = data.weightedPctChangeUnits > 0
        ? data.weightedPctChangeSum / data.weightedPctChangeUnits
        : 0

      const hasValidCost = data.totalCost > 0
      const returnAmount = hasValidCost ? data.totalCurrentValue - data.totalCost : 0
      const returnPercent = hasValidCost ? (returnAmount / data.totalCost) * 100 : 0

      return {
        symbol,
        assetName: data.assetName,
        currentValue: data.totalCurrentValue,
        changePercent: pctChange,
        absChange: Math.abs(pctChange),
        isPositive: pctChange >= 0,
        assetType: data.assetType,
        totalUnits: data.totalUnits,
        totalCost: data.totalCost,
        hasValidCost,
        returnAmount,
        returnPercent,
        ltp: data.ltp,
      }
    }).sort((a, b) => b.currentValue - a.currentValue)
  }, [portfolio])

  // Filter items by assetType if needed
  const heatMapItems = useMemo(() => {
    return rawHeatMapItems.filter(item => {
      if (assetFilter === "all") return true
      if (assetFilter === "stock") return item.assetType !== "crypto"
      if (assetFilter === "crypto") return item.assetType === "crypto"
      return true
    })
  }, [rawHeatMapItems, assetFilter])

  if (rawHeatMapItems.length === 0) {
    return (
      <Card className="bg-card/45 backdrop-blur-md border border-border/40 overflow-hidden text-left shadow-lg">
        <CardHeader className="pb-2 px-4 pt-4 border-b border-border/10">
          <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5 text-primary" /> Portfolio Heat Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-[11px] text-muted-foreground px-4 py-8 text-center font-medium">No active holdings with market prices available.</p>
        </CardContent>
      </Card>
    )
  }

  const sizeModeLabel = sizeMode === "allocation" ? "Value Allocation" : sizeMode === "units" ? "Units Count" : "Net Returns"
  const colorModeLabel = colorMode === "daily" ? "Daily Change" : "Total Return"

  return (
    <Card className="bg-card/45 backdrop-blur-md border border-border/40 overflow-hidden text-left shadow-xl flex flex-col h-full rounded-2xl gap-0">
      <CardHeader className="pb-0 px-4 pt-2 border-b border-border/10 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-primary" /> Portfolio Heat Map
            </CardTitle>
            <CardDescription className="text-[9px] font-bold text-muted-foreground/80 mt-0.5">
              {heatMapItems.length} holdings · Sized by <span className="text-primary">{sizeModeLabel}</span> · Colored by <span className="text-primary">{colorModeLabel}</span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            title="What do these options mean?"
            onClick={() => setShowInfo(true)}
            className="h-7 w-7 shrink-0 rounded-lg border-border/35 bg-card/60 hover:bg-muted/30 transition-all text-muted-foreground"
          >
            <Info className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-7 h-7 text-[10px] rounded-lg border-border/30 bg-muted/10 w-full font-medium focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-0.5 border-t border-border/5">
          {/* Asset filter */}
          <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-lg border border-border/20">
            <span className="text-[9px] font-black uppercase text-muted-foreground px-1.5 flex items-center gap-0.5">
              <Filter className="w-2.5 h-2.5" /> Filter:
            </span>
            <button
              onClick={() => { setAssetFilter("all"); setSelectedItem(null); }}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${assetFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            <button
              onClick={() => { setAssetFilter("stock"); setSelectedItem(null); }}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${assetFilter === "stock" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Stocks
            </button>
            <button
              onClick={() => { setAssetFilter("crypto"); setSelectedItem(null); }}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${assetFilter === "crypto" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Crypto
            </button>
          </div>

          {/* Sizing metric selector */}
          <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-lg border border-border/20">
            <span className="text-[9px] font-black uppercase text-muted-foreground px-1.5">Size:</span>
            <button
              onClick={() => setSizeMode("allocation")}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${sizeMode === "allocation" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Val
            </button>
            <button
              onClick={() => setSizeMode("units")}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${sizeMode === "units" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Units
            </button>
            <button
              onClick={() => setSizeMode("return")}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${sizeMode === "return" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Return
            </button>
          </div>

          {/* Coloring metric selector */}
          <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-lg border border-border/20">
            <span className="text-[9px] font-black uppercase text-muted-foreground px-1.5">Color:</span>
            <button
              onClick={() => setColorMode("daily")}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${colorMode === "daily" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Daily %
            </button>
            <button
              onClick={() => setColorMode("total")}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${colorMode === "total" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Total %
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-1 pt-0 flex flex-col flex-1 gap-0.5">
        {heatMapItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border/30 rounded-xl min-h-[300px] text-center">
            <span className="text-[11px] text-muted-foreground font-semibold">No assets found for the selected filter.</span>
          </div>
        ) : (
          <>
            <HeatMapContent
              items={heatMapItems}
              sizeMode={sizeMode}
              colorMode={colorMode}
              searchQuery={searchQuery}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              heightClass="h-[320px] sm:h-[380px] md:h-[440px] lg:h-[480px]"
            />

            {/* Custom interactive legend */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-border/20 px-3 py-2 bg-muted/10 rounded-xl text-[10px] font-bold text-muted-foreground gap-2">
              <div className="flex items-center gap-2">
                <span>Loss</span>
                <div className="h-2.5 w-28 rounded-md bg-gradient-to-r from-red-500/80 via-muted/30 to-emerald-500/80" />
                <span>Gain</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[8px] tracking-tight bg-background/50 font-semibold py-0 text-muted-foreground">
                  Intensity: % change strength
                </Badge>
                {selectedItem && (
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedItem(null)}
                    className="h-5 px-1.5 text-[9px] hover:bg-muted font-bold text-primary gap-0.5"
                  >
                    Clear selection
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile/Click Detailed Card */}
            {selectedItem && (
              <div className="p-3 border border-border/50 bg-muted/10 rounded-xl flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-300 relative shadow-sm">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-all"
                  title="Close details"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

              <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-foreground">{selectedItem.symbol}</span>
                      <Badge className="text-[8px] uppercase tracking-wider font-extrabold px-1 h-4 bg-primary/10 text-primary border-0">
                        {selectedItem.assetType === 'crypto' ? 'Crypto' : 'Stock'}
                      </Badge>
                    </div>
                    {selectedItem.assetName && (
                      <span className="text-[9px] text-muted-foreground font-medium">{selectedItem.assetName}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Current Value</span>
                    <span className="font-black text-foreground text-xs">{money(selectedItem.currentValue)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Units Held</span>
                    <span className="font-black text-foreground text-xs">{selectedItem.totalUnits.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Avg Cost / Unit</span>
                    <span className="font-black text-foreground text-xs">
                      {selectedItem.hasValidCost ? `${money(selectedItem.totalCost / selectedItem.totalUnits, { maximumFractionDigits: 2 })}` : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Daily Change</span>
                    <span className={`font-black text-xs ${selectedItem.changePercent >= 0 ? 'text-success' : 'text-error'}`}>
                      {selectedItem.changePercent >= 0 ? '+' : ''}{selectedItem.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex flex-col col-span-2 md:col-span-4">
                    <span className="text-muted-foreground text-[9px] font-black uppercase tracking-wider">Total Net Return</span>
                    {selectedItem.hasValidCost ? (
                      <span className={`font-black text-xs ${selectedItem.returnAmount >= 0 ? 'text-success' : 'text-error'}`}>
                        {selectedItem.returnAmount >= 0 ? '+' : ''}{moneySigned(selectedItem.returnAmount, { maximumFractionDigits: 2 })} ({selectedItem.returnPercent >= 0 ? '+' : ''}{selectedItem.returnPercent.toFixed(2)}%)
                      </span>
                    ) : (
                      <span className="font-black text-xs text-muted-foreground/60">- (no cost data available)</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
              <Info className="w-4 h-4 text-primary" /> How the Heat Map works
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5" /> Tile Size
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground pl-5">
                <p><span className="font-semibold text-foreground">Value Allocation</span> - Each tile&apos;s area represents its share of your total portfolio value. Larger tiles = bigger holdings.</p>
                <p><span className="font-semibold text-foreground">Units Count</span> - Tile size reflects the number of shares/coins held, regardless of price.</p>
                <p><span className="font-semibold text-foreground">Net Returns</span> - Tile size reflects the absolute profit or loss amount. Larger tiles = bigger gains or losses.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Tile Color
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground pl-5">
                <p><span className="font-semibold text-foreground">Daily %</span> - Colors show today&apos;s price change. Green = up, Red = down. Intensity reflects how big the move was.</p>
                <p><span className="font-semibold text-foreground">Total %</span> - Colors show your total return since purchase. Green = profit, Red = loss. Intensity reflects the return magnitude.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filters
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground pl-5">
                <p><span className="font-semibold text-foreground">All / Stocks / Crypto</span> - Show every asset type, or narrow down to just stocks or cryptocurrencies.</p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/20 p-3 space-y-1">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Interacting
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                <li>Hover any tile to see detailed info in a tooltip.</li>
                <li>Tap or click a tile to pin its details below the map.</li>
                <li>Use the search bar to highlight a specific symbol.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
