"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {Loader2,RefreshCcw,Coins,History,Info,Check,ChevronDown} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog"
import {Command,CommandEmpty,CommandGroup,CommandInput,CommandItem,CommandList,} from "@/components/ui/command"
import {Popover,PopoverContent,PopoverTrigger,} from "@/components/ui/popover"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CurrencyConverterDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const CONVERSION_CACHE_TTL_MS = 5 * 60 * 1000

const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "NPR", name: "Nepalese Rupee", flag: "🇳🇵" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "QAR", name: "Qatari Rial", flag: "🇶🇦" },
  { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭" },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷" },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪" },
  { code: "DKK", name: "Danish Krone", flag: "🇩🇰" },
]

export function CurrencyConverterDialog({ isOpen, onOpenChange }: CurrencyConverterDialogProps) {
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("NPR")
  const [convertAmount, setConvertAmount] = useState("1")
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [conversionRate, setConversionRate] = useState<number | null>(null)
  const [conversionDate, setConversionDate] = useState("")
  const [lastRateSource, setLastRateSource] = useState<"cache" | "network" | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)

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
    const timeout = setTimeout(() => {
      handleCurrencyConversion(false)
    }, 100)
    return () => clearTimeout(timeout)
  }, [isOpen, fromCurrency, toCurrency, handleCurrencyConversion])

  const handleSwap = () => {
    setIsSwapping(true)
    const oldFrom = fromCurrency
    const oldTo = toCurrency
    setFromCurrency(oldTo)
    setToCurrency(oldFrom)
    setConvertedAmount(null)
    setConversionRate(null)
    setTimeout(() => setIsSwapping(false), 500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] h-[90vh] sm:h-[650px] p-0 flex flex-col gap-0 overflow-hidden border-0 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] bg-background/95 backdrop-blur-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

        {/* Fixed Header */}
        <DialogHeader className="p-6 pb-4 relative z-10 shrink-0 border-b border-muted/20 bg-background/50 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 shadow-sm">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Currency Converter</DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Market Rates
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar overscroll-contain">
          <div className="p-6 space-y-8 min-h-full">
            <div className="space-y-4">
              {/* Amount & From */}
              <div className="relative group">
                <Card className="border-2 border-muted/50 group-focus-within:border-primary/40 transition-all duration-300 bg-background/50 backdrop-blur-sm overflow-visible rounded-2xl shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">From Amount</Label>
                      <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 h-5 bg-muted/30 border-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {CURRENCIES.find(c => c.code === fromCurrency)?.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        id="converter-amount"
                        type="text"
                        inputMode="decimal"
                        value={convertAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '')
                          setConvertAmount(val)
                        }}
                        className="border-0 p-0 text-2xl h-auto font-bold focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/30 shadow-none ring-0 focus-visible:ring-offset-0 ring-primary/40"
                        placeholder="1,000"
                      />
                      <CurrencySelector
                        value={fromCurrency}
                        onChange={setFromCurrency}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Swap Button */}
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-full z-20">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleSwap}
                    className={cn(
                      "rounded-2xl h-11 w-11 shadow-lg border-4 border-background hover:scale-110 active:scale-95 transition-all duration-300 group/swap bg-primary text-primary-foreground",
                      isSwapping && "rotate-180"
                    )}
                  >
                    <RefreshCcw className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* To Section */}
              <Card className="border-2 border-muted/50 bg-background/50 backdrop-blur-sm overflow-visible rounded-2xl group transition-all duration-300 hover:border-primary/20 shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">To Currency</Label>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 h-5 bg-muted/30 border-none opacity-0 group-hover:opacity-100 transition-opacity">
                      {CURRENCIES.find(c => c.code === toCurrency)?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      {isConverting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                          <span className="text-muted-foreground/40 font-bold text-2xl animate-pulse">Calculating...</span>
                        </div>
                      ) : convertedAmount !== null ? (
                        <span className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                          {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground/30 tracking-tight">0.00</span>
                      )}
                    </div>
                    <CurrencySelector
                      value={toCurrency}
                      onChange={setToCurrency}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Info Section */}
            <div className="space-y-3">
              {conversionDate && !isConverting && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground/50 animate-in fade-in duration-500">
                  <History className="h-3 w-3" />
                  Rate updated on {new Date(conversionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}

              <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-yellow-500/5 text-yellow-600 dark:text-yellow-400/80 ring-1 ring-yellow-500/10">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <p className="text-[10px] font-medium leading-tight text-pretty">
                  Market rates provided for informational purposes only. Actual rates may vary by bank or service provider.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-2xl font-bold border-muted/50 hover:bg-muted/30 transition-all active:scale-95"
                onClick={() => onOpenChange(false)}
              >
                CANCEL
              </Button>
              <Button
                type="button"
                className="flex-[2] h-12 rounded-2xl font-bold bg-primary hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                onClick={() => handleCurrencyConversion(true)}
                disabled={isConverting}
              >
                {isConverting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    UPDATING...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    CONVERT
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CurrencySelector({
  value,
  onChange
}: {
  value: string,
  onChange: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedCurrency = CURRENCIES.find((c) => c.code === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[110px] h-10 rounded-xl bg-muted/40 border-0 justify-between font-bold hover:bg-muted/60 transition-colors focus:ring-0 focus:ring-offset-0 shrink-0"
        >
          <span className="flex items-center gap-2 overflow-hidden">
            <span>{selectedCurrency?.flag}</span>
            <span className="font-bold tracking-tight">{value}</span>
          </span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0 rounded-2xl border-muted/40 overflow-hidden shadow-2xl backdrop-blur-xl bg-background/95 z-[100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="bg-transparent" loop>
          <CommandInput placeholder="Search currency..." className="h-10" />
          <CommandList className="max-h-[280px] custom-scrollbar">
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup heading="Currencies">
              {CURRENCIES.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={currency.code + " " + currency.name}
                  onSelect={() => {
                    onChange(currency.code)
                    setOpen(false)
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer mx-1 my-0.5 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{currency.flag}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm leading-none">{currency.code}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{currency.name}</span>
                    </div>
                  </div>
                  {value === currency.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
