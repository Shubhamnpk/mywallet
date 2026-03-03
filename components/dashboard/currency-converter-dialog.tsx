"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeftRight, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CurrencyConverterDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const CONVERSION_CACHE_TTL_MS = 5 * 60 * 1000

export function CurrencyConverterDialog({ isOpen, onOpenChange }: CurrencyConverterDialogProps) {
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("NPR")
  const [convertAmount, setConvertAmount] = useState("1")
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [conversionRate, setConversionRate] = useState<number | null>(null)
  const [conversionDate, setConversionDate] = useState("")
  const [lastRateSource, setLastRateSource] = useState<"cache" | "network" | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const conversionCacheRef = useRef<Map<string, { rate: number; date: string; fetchedAt: number }>>(new Map())

  const getExchangeRate = useCallback(async (from: string, to: string) => {
    if (from === to) {
      return {
        rate: 1,
        date: new Date().toISOString().slice(0, 10),
        source: "cache" as const,
      }
    }

    const cacheKey = `${from}_${to}`
    const cached = conversionCacheRef.current.get(cacheKey)
    const isFresh = !!cached && Date.now() - cached.fetchedAt < CONVERSION_CACHE_TTL_MS
    if (isFresh && cached) {
      return { rate: cached.rate, date: cached.date, source: "cache" as const }
    }

    const url = `/api/currency/convert?from=${from}&to=${to}`
    const response = await fetch(url)

    if (!response.ok) {
      let message = `Conversion request failed (${response.status})`
      try {
        const errorData = await response.json()
        if (typeof errorData?.error === "string") {
          message = errorData.error
        }
      } catch {
        // Ignore parse errors and keep default message.
      }
      throw new Error(message)
    }

    const data = await response.json()
    const rate = typeof data?.rate === "number" ? data.rate : null
    if (typeof rate !== "number") {
      throw new Error("Could not read conversion rate")
    }
    const date = typeof data?.date === "string" ? data.date : ""
    conversionCacheRef.current.set(cacheKey, { rate, date, fetchedAt: Date.now() })
    return { rate, date, source: "network" as const }
  }, [])

  const handleCurrencyConversion = useCallback(async (showToast = true) => {
    const amountNumber = Number(convertAmount)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      if (showToast) toast.error("Enter a valid amount greater than 0")
      return
    }

    if (fromCurrency.length !== 3 || toCurrency.length !== 3) {
      if (showToast) toast.error("Currency codes must be 3 letters (e.g. USD, NPR)")
      return
    }

    const from = fromCurrency.toUpperCase()
    const to = toCurrency.toUpperCase()
    setIsConverting(true)
    try {
      const { rate, date, source } = await getExchangeRate(from, to)
      setConversionRate(rate)
      setConvertedAmount(amountNumber * rate)
      setConversionDate(date)
      setLastRateSource(source)

      if (showToast) {
        toast.success(source === "cache" ? "Used cached live rate" : "Updated with latest live rate")
      }
    } catch (error) {
      console.error("Currency conversion failed:", error)
      toast.error(error instanceof Error ? error.message : "Conversion failed. Try again.")
    } finally {
      setIsConverting(false)
    }
  }, [convertAmount, fromCurrency, toCurrency, getExchangeRate])

  useEffect(() => {
    if (!isOpen) return
    if (fromCurrency.length !== 3 || toCurrency.length !== 3) return
    handleCurrencyConversion(false)
  }, [isOpen, fromCurrency, toCurrency, handleCurrencyConversion])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg min-h-[520px] animate-in fade-in-0 zoom-in-95 duration-300 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            Currency Converter
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 rounded-xl bg-gradient-to-b from-cyan-50/60 via-background to-background p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fast live rates via server route (Frankfurter API). Rates are cached for 5 minutes for instant repeat conversions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="converter-amount">Amount</Label>
              <Input
                id="converter-amount"
                inputMode="decimal"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder="1"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="converter-from">From</Label>
              <Input
                id="converter-from"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="USD"
                className="h-11 rounded-xl uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="converter-to">To</Label>
              <Input
                id="converter-to"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="NPR"
                className="h-11 rounded-xl uppercase"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["USD->NPR", "EUR->NPR", "USD->INR"].map((pair) => (
              <Button
                key={pair}
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  const [from, to] = pair.split("->")
                  setFromCurrency(from)
                  setToCurrency(to)
                }}
              >
                {pair}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFromCurrency(toCurrency)
                setToCurrency(fromCurrency)
                setConvertedAmount(null)
                setConversionRate(null)
              }}
              className="shrink-0"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Swap
            </Button>
            <Button
              type="button"
              onClick={() => handleCurrencyConversion(true)}
              disabled={isConverting}
              className="min-w-[160px]"
            >
              {isConverting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Converting...
                </span>
              ) : "Convert"}
            </Button>
          </div>

          {convertedAmount !== null && conversionRate !== null && (
            <div className="rounded-xl border border-cyan-100 bg-white/80 p-4 space-y-1 shadow-sm">
              <p className="text-sm text-muted-foreground">Converted amount</p>
              <p className="text-xl font-semibold tracking-tight">
                {Number(convertAmount).toLocaleString()} {fromCurrency} ={" "}
                <span className="text-cyan-700">{convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {toCurrency}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                1 {fromCurrency} = {conversionRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toCurrency}
              </p>
              {conversionDate && (
                <p className="text-xs text-muted-foreground">
                  Rate date: {conversionDate}
                  {lastRateSource ? ` - ${lastRateSource === "cache" ? "cached" : "live"}` : ""}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

