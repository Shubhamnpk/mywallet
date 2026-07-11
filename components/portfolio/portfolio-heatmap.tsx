"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LayoutGrid, BarChart3, Package } from "lucide-react"
import type { PortfolioItem } from "@/types/wallet"

type SizeMode = "allocation" | "units" | "return"

interface HeatMapItem {
  symbol: string
  currentValue: number
  changePercent: number
  absChange: number
  isPositive: boolean
  assetType?: string
  totalUnits: number
  totalCost: number
  returnAmount: number
}

interface PortfolioHeatMapProps {
  portfolio: PortfolioItem[]
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

function HeatMapContent({
  items,
  sizeMode,
  height,
  hideLastN,
}: {
  items: HeatMapItem[]
  sizeMode: SizeMode
  height: string
  hideLastN: number
}) {
  const maxAbsChange = items.length > 0 ? Math.max(...items.map(i => i.absChange), 1) : 1

  const sizingKey = sizeMode === "allocation" ? "currentValue" : sizeMode === "units" ? "totalUnits" : "returnAmount"
  const totalSize = items.reduce((s, i) => s + Math.abs(i[sizingKey]), 0) || 1

  const indexed = items
    .map((item, i) => ({ value: Math.abs(item[sizingKey]) / totalSize, index: i }))
    .sort((a, b) => b.value - a.value)
  const rects: ({ x: number; y: number; w: number; h: number; index: number })[] = []

  function squarify(entries: { value: number; index: number }[], rect: { x: number; y: number; w: number; h: number }, result: { x: number; y: number; w: number; h: number; index: number }[]) {
    if (entries.length === 0) return
    const totalValue = entries.reduce((s, e) => s + e.value, 0)
    if (totalValue === 0) { for (const e of entries) result.push({ x: 0, y: 0, w: 0, h: 0, index: e.index }); return }

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
        result.push({ x: rowX, y: rowY + acc * rowH, w: rowW, h: f * rowH, index: e.index })
        acc += f
      } else {
        result.push({ x: rowX + acc * rowW, y: rowY, w: f * rowW, h: rowH, index: e.index })
        acc += f
      }
    }

    const remainingRect = isVertical
      ? { x: rect.x + rowW, y: rect.y, w: Math.max(0, rect.w - rowW), h: rect.h }
      : { x: rect.x, y: rect.y + rowH, w: rect.w, h: Math.max(0, rect.h - rowH) }

    squarify(remaining, remainingRect, result)
  }

  squarify(indexed, { x: 0, y: 0, w: 100, h: 100 }, rects)

  const rectsByOriginalIndex = rects.sort((a, b) => a.index - b.index)
  const gap = 1

  return (
    <div className="rounded-b-xl border border-border/5 bg-border/5" style={{ position: 'relative', width: '100%', height }}>
      {items.map((item, idx) => {
        const r = rectsByOriginalIndex[idx]
        const minAlpha = 0.06
        const maxAlpha = 0.40
        const showLabel = idx < items.length - hideLastN
        const fontSize = showLabel ? Math.max(8, Math.min(16, Math.sqrt(r.w * r.h * 0.08))) : 0
        const displayPct = sizeMode === "return" && item.totalCost > 0
          ? ((item.currentValue - item.totalCost) / item.totalCost) * 100
          : item.changePercent
        const displayAbsChange = Math.abs(displayPct)
        const isDisplayPositive = displayPct >= 0
        const modeMaxAbsChange = sizeMode === "return"
          ? Math.max(...items.map(i => Math.abs(i.totalCost > 0 ? ((i.currentValue - i.totalCost) / i.totalCost) * 100 : 0)), 1)
          : maxAbsChange
        const modeIntensity = Math.min(displayAbsChange / modeMaxAbsChange, 1)
        const alpha = minAlpha + modeIntensity * (maxAlpha - minAlpha)
        const rCol = item.isPositive ? 16 : 239
        const gCol = item.isPositive ? 185 : 68
        const bCol = item.isPositive ? 129 : 68
        const bgColor = `rgba(${rCol},${gCol},${bCol},${alpha})`
        const textAlpha = Math.max(0.5, 0.5 + modeIntensity * 0.5)
        const textColor = `rgba(${rCol},${gCol},${bCol},${textAlpha})`
        const displayR = isDisplayPositive ? 16 : 239
        const displayG = isDisplayPositive ? 185 : 68
        const displayB = isDisplayPositive ? 129 : 68
        const displayBgColor = `rgba(${displayR},${displayG},${displayB},${alpha})`
        const displayTextColor = `rgba(${displayR},${displayG},${displayB},${textAlpha})`
        return (
          <div
            key={item.symbol}
            className="flex flex-col items-center justify-center text-center cursor-default transition-all duration-200 hover:brightness-125 hover:z-10 overflow-hidden rounded-[1px] group"
            style={{
              position: 'absolute',
              left: `calc(${r.x}% + ${gap}px)`,
              top: `calc(${r.y}% + ${gap}px)`,
              width: `calc(${r.w}% - ${2 * gap}px)`,
              height: `calc(${r.h}% - ${2 * gap}px)`,
              backgroundColor: sizeMode === "return" ? displayBgColor : bgColor,
            }}
            title={`${item.symbol}\n${item.assetType === 'crypto' ? 'Crypto' : 'Stock'}\nValue: रु ${item.currentValue.toLocaleString()}\nUnits: ${item.totalUnits}\n${sizeMode === 'return' ? 'Return' : 'Change'}: ${isDisplayPositive ? '+' : ''}${displayPct.toFixed(2)}%`}
          >
            {showLabel ? (
              <>
                <span
                  className="font-black leading-tight px-0.5"
                  style={{ fontSize: `${fontSize}px`, color: 'rgba(255,255,255,0.92)' }}
                >
                  {item.symbol}
                </span>
                <span
                  className="font-bold mt-0.5"
                  style={{ fontSize: `${Math.max(6, fontSize - 2)}px`, color: sizeMode === "return" ? displayTextColor : textColor }}
                >
                  {isDisplayPositive ? '+' : ''}{displayPct.toFixed(1)}%
                </span>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span
                  className="font-black leading-tight px-1 text-center"
                  style={{ fontSize: '9px', color: 'rgba(255,255,255,0.92)' }}
                >
                  {item.symbol}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function PortfolioHeatMap({ portfolio }: PortfolioHeatMapProps) {
  const [sizeMode, setSizeMode] = useState<SizeMode>("allocation")

  const heatMapItems = useMemo(() => {
    const grouped = new Map<string, { totalUnits: number; totalCost: number; totalCurrentValue: number }>()
    for (const item of portfolio) {
      if (item.units <= 0 || !isFiniteNumber(item.currentPrice)) continue
      const price = isFiniteNumber(item.currentPrice) ? item.currentPrice! : 0
      const currentValue = item.units * price
      const cost = item.units * (isFiniteNumber(item.buyPrice) ? item.buyPrice : 0)
      const existing = grouped.get(item.symbol)
      if (existing) {
        existing.totalUnits += item.units
        existing.totalCost += cost
        existing.totalCurrentValue += currentValue
      } else {
        grouped.set(item.symbol, { totalUnits: item.units, totalCost: cost, totalCurrentValue: currentValue })
      }
    }
    return Array.from(grouped.entries()).map(([symbol, data]) => {
      const portfolioItem = portfolio.find(p => p.symbol === symbol)
      const pctChange = isFiniteNumber(portfolioItem?.percentChange) ? portfolioItem.percentChange! : 0
      const returnAmount = data.totalCurrentValue - data.totalCost
      return {
        symbol,
        currentValue: data.totalCurrentValue,
        changePercent: pctChange,
        absChange: Math.abs(pctChange),
        isPositive: pctChange >= 0,
        assetType: portfolioItem?.assetType,
        totalUnits: data.totalUnits,
        totalCost: data.totalCost,
        returnAmount,
      }
    }).sort((a, b) => b.currentValue - a.currentValue)
  }, [portfolio])

  if (heatMapItems.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-muted/50 overflow-hidden text-left">
        <CardHeader className="pb-2 px-4 pt-3 border-b border-border/20">
          <CardTitle className="text-xs font-black uppercase tracking-widest">Portfolio Heat Map</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-[10px] text-muted-foreground px-4 py-6">No holdings with current prices yet.</p>
        </CardContent>
      </Card>
    )
  }

  const sizeModeLabel = sizeMode === "allocation" ? "allocation" : sizeMode === "units" ? "units" : "return"

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-muted/50 overflow-hidden text-left">
      <CardHeader className="pb-2 px-4 pt-3 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xs font-black uppercase tracking-widest">Portfolio Heat Map</CardTitle>
            <CardDescription className="text-[9px] mt-0.5">{heatMapItems.length} holdings · sized by {sizeModeLabel}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant={sizeMode === "allocation" ? "default" : "ghost"}
                size="sm"
                className="h-6 text-[9px] px-1.5 font-bold gap-0.5"
                onClick={() => setSizeMode("allocation")}
              >
                <BarChart3 className="w-2.5 h-2.5" /> Val
              </Button>
              <Button
                variant={sizeMode === "units" ? "default" : "ghost"}
                size="sm"
                className="h-6 text-[9px] px-1.5 font-bold gap-0.5"
                onClick={() => setSizeMode("units")}
              >
                <Package className="w-2.5 h-2.5" /> Units
              </Button>
              <Button
                variant={sizeMode === "return" ? "default" : "ghost"}
                size="sm"
                className="h-6 text-[9px] px-1.5 font-bold gap-0.5"
                onClick={() => setSizeMode("return")}
              >
                <LayoutGrid className="w-2.5 h-2.5" /> Ret
              </Button>
            </div>
            <span className="flex items-center gap-1 text-[8px] font-bold text-success"><span className="inline-block w-2 h-2 rounded-sm bg-success/40" /> Gain</span>
            <span className="flex items-center gap-1 text-[8px] font-bold text-error"><span className="inline-block w-2 h-2 rounded-sm bg-error/40" /> Loss</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <HeatMapContent items={heatMapItems} sizeMode={sizeMode} height="480px" hideLastN={3} />
      </CardContent>
    </Card>
  )
}
