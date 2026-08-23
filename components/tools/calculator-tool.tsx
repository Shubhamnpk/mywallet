"use client"

import { useState, useCallback, useRef } from "react"
import { Calculator, History, X, Delete } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  normalizeCalculatorExpression,
  calculateExpressionResult,
  getCalculatorPreview,
} from "@/lib/calculator-math"

const CALC_BUTTONS = [
  "7", "8", "9", "/", "Del",
  "4", "5", "6", "*", "C",
  "1", "2", "3", "+", "%",
  "0", "00", ".", "-", "=",
]

function BackspaceButton({ onDelete, onClearAll }: { onDelete: () => void; onClearAll: () => void }) {
  const [isLongPressing, setIsLongPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)

  const startLongPress = useCallback(() => {
    longPressFiredRef.current = false
    setIsLongPressing(true)
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      onClearAll()
      setIsLongPressing(false)
    }, 600)
  }, [onClearAll])

  const endLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsLongPressing(false)
  }, [])

  const handleClick = useCallback(() => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    onDelete()
  }, [onDelete])

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleClick}
      onPointerDown={startLongPress}
      onPointerUp={endLongPress}
      onPointerLeave={endLongPress}
      onPointerCancel={endLongPress}
      aria-label="Delete last character. Hold to clear all."
      title="Tap to delete last, hold to clear all"
      className={cn(
        "relative h-12 rounded-xl text-lg font-semibold transition-all duration-150 ease-out overflow-hidden",
        "hover:scale-105 hover:shadow-md active:scale-95 active:shadow-sm",
        "focus:ring-2 focus:ring-primary/20 focus:outline-none",
        "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20",
        isLongPressing && "scale-95 bg-red-50 dark:bg-red-950/20"
      )}
    >
      <Delete className="h-5 w-5" />
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-red-500/70 transition-transform duration-500 ease-linear",
          isLongPressing ? "scale-x-100" : "scale-x-0"
        )}
      />
    </Button>
  )
}

export function CalculatorTool() {
  const [expression, setExpression] = useState("")
  const [display, setDisplay] = useState("0")
  const [history, setHistory] = useState<{ expression: string; result: string }[]>([])
  const [view, setView] = useState<"keys" | "history">("keys")

  const handleInput = useCallback((value: string) => {
    if (value === "C") {
      setExpression("")
      setDisplay("0")
      return
    }

    if (value === "Del") {
      setExpression((prev) => {
        const next = prev.slice(0, -1)
        setDisplay(getCalculatorPreview(next))
        return next
      })
      return
    }

    if (value === "=") {
      const result = calculateExpressionResult(expression)
      if (result !== "Error") {
        setHistory((prev) => {
          const entry = { expression, result }
          const filtered = prev.filter(
            (item) => item.expression !== entry.expression || item.result !== entry.result
          )
          return [entry, ...filtered].slice(0, 20)
        })
        setDisplay(result)
        setExpression(result)
      } else {
        setDisplay("Error")
      }
      return
    }

    setExpression((prev) => {
      const next = `${prev === "0" ? "" : prev}${value}`
      setDisplay(getCalculatorPreview(next))
      return next
    })
  }, [expression])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleInput("=")
    }
  }, [handleInput])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = normalizeCalculatorExpression(e.target.value)
    setExpression(value)
    setDisplay(getCalculatorPreview(value))
  }, [])

  const useHistoryItem = useCallback((item: { expression: string; result: string }) => {
    setExpression(item.result)
    setDisplay(item.result)
    setView("keys")
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return (
    <Card className="bg-card/45 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl">
      <CardHeader className="pb-2 px-4 pt-3 border-b border-border/10">
        <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-primary" /> Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3 shadow-inner">
          <Input
            value={expression}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="0"
            className="h-12 border-0 bg-transparent px-0 text-right font-mono text-2xl font-bold shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>Live result</span>
            <span className="max-w-[220px] truncate font-mono text-foreground">{display}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 rounded-xl border bg-muted/20 p-1">
          <Button
            type="button"
            variant={view === "keys" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => setView("keys")}
          >
            Keys
          </Button>
          <Button
            type="button"
            variant={view === "history" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => setView("history")}
            disabled={history.length === 0}
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            History
            {history.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                {history.length}
              </span>
            )}
          </Button>
        </div>

        {view === "history" ? (
          <div className="min-h-[248px] rounded-xl border bg-muted/15 p-2">
            {history.length > 0 ? (
              <>
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    Recent calculations
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={clearHistory}
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1">
                  {history.map((item, i) => (
                    <button
                      key={`${item.expression}-${item.result}-${i}`}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted"
                      onClick={() => useHistoryItem(item)}
                      title="Use this result"
                    >
                      <span className="min-w-0 truncate font-mono text-muted-foreground">{item.expression}</span>
                      <span className="shrink-0 font-mono font-semibold text-foreground">{item.result}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[232px] flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <History className="mb-2 h-6 w-6 opacity-60" />
                Run a calculation to save history.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {CALC_BUTTONS.map((btn, i) => (
              btn === "Del" ? (
                <BackspaceButton
                  key={btn}
                  onDelete={() => handleInput("Del")}
                  onClearAll={() => handleInput("C")}
                />
              ) : (
              <Button
                key={btn}
                variant={btn === "=" ? "default" : "outline"}
                size="lg"
                onClick={() => handleInput(btn)}
                className={cn(
                  "h-12 rounded-xl text-lg font-semibold transition-all duration-150 ease-out",
                  "hover:scale-105 hover:shadow-md active:scale-95 active:shadow-sm",
                  "focus:ring-2 focus:ring-primary/20 focus:outline-none",
                  btn === "C" && "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20",
                  ["/", "*", "+", "-", "%"].includes(btn) && "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
                  btn === "=" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg",
                  "animate-in slide-in-from-bottom-1 fade-in-0"
                )}
                style={{ animationDelay: `${i * 20}ms` }}
                aria-label={`Calculator button ${btn}`}
              >
                {btn}
              </Button>
              )
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
