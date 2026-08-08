"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCurrencySymbol, getNumberFormatLocale, getNprToCurrencyRate } from "@/lib/currency"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { compactAmount } from "@/lib/money-format"

export type ShareCurrencyState = {
  enabled: boolean
  currency: string
  symbol: string
  rate: number
  via: "fixed" | "live"
  isConverting: boolean
  /** Convert an NPR amount into the display currency. Returns the raw (unformatted) number. */
  convertNpr: (amountNpr: number) => number
  /** Format a numeric amount in the display currency WITHOUT a currency symbol. */
  format: (amount: number, opts?: { maximumFractionDigits?: number }) => string
  /** Format an NPR amount directly in the display currency. */
  formatNpr: (amountNpr: number, opts?: { maximumFractionDigits?: number }) => string
  /** Format an already-converted amount in the display currency. */
  formatConverted: (amount: number, opts?: { maximumFractionDigits?: number }) => string
  /** Format an NPR amount with symbol + number. */
  money: (amountNpr: number, opts?: { maximumFractionDigits?: number }) => string
  /** Format an NPR amount, stripping the leading symbol (for +/− placement). */
  moneySigned: (amountNpr: number, opts?: { maximumFractionDigits?: number }) => string
  /** Format an NPR amount compactly (K/M/B/T) with the currency symbol. */
  moneyCompact: (amountNpr: number | null | undefined) => string
}

const RATE_CACHE_KEY = "wallet_share_currency_rate_v1"
const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export function useShareCurrency(): ShareCurrencyState {
  const { userProfile } = useWalletData()
  const profileCurrency = userProfile?.currency || "NPR"
  const mode = userProfile?.meroShare?.shareCurrencyMode || "npr"

  const enabled = mode === "auto" && profileCurrency.toUpperCase() !== "NPR"
  const currency = enabled ? profileCurrency : "NPR"
  const symbol = getCurrencySymbol(currency, (userProfile as any)?.customCurrency)

  const [rate, setRate] = useState(1)
  const [via, setVia] = useState<"fixed" | "live">("fixed")
  const [isConverting, setIsConverting] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!enabled || currency === "INR" || currency === "NPR") {
      setRate(currency === "INR" ? 1 / 1.6 : 1)
      setVia("fixed")
      setIsConverting(false)
      return
    }

    const cached = (() => {
      try {
        const raw = localStorage.getItem(RATE_CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as { currency: string; rate: number; at: number }
        if (parsed.currency !== currency) return null
        if (Date.now() - parsed.at > RATE_CACHE_TTL_MS) return null
        return parsed.rate
      } catch {
        return null
      }
    })()

    if (cached !== null && Number.isFinite(cached) && cached > 0) {
      setRate(cached)
      setVia("live")
      setIsConverting(false)
      return
    }

    setIsConverting(true)
    getNprToCurrencyRate({ toCurrency: currency }).then((res) => {
      if (cancelled) return
      setIsConverting(false)
      if (res.rate > 0) {
        setRate(res.rate)
        setVia(res.via)
        try {
          localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ currency, rate: res.rate, at: Date.now() }))
        } catch {
          // storage unavailable
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [enabled, currency])

  const convertNpr = useCallback(
    (amountNpr: number) => {
      const safe = Number.isFinite(amountNpr) ? amountNpr : 0
      return safe * rate
    },
    [rate],
  )

  const formatConverted = useCallback(
    (amount: number, opts?: { maximumFractionDigits?: number }) => {
      const safe = Number.isFinite(amount) ? amount : 0
      return `${symbol}${safe.toLocaleString(getNumberFormatLocale(), {
        minimumFractionDigits: 0,
        maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
      })}`
    },
    [symbol],
  )

  const format = useCallback(
    (amount: number, opts?: { maximumFractionDigits?: number }) => {
      const safe = Number.isFinite(amount) ? amount : 0
      return safe.toLocaleString(getNumberFormatLocale(), {
        minimumFractionDigits: 0,
        maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
      })
    },
    [],
  )

  const formatNpr = useCallback(
    (amountNpr: number, opts?: { maximumFractionDigits?: number }) => formatConverted(convertNpr(amountNpr), opts),
    [convertNpr, formatConverted],
  )

  /** Format an NPR amount with symbol + full number (symbol prefix like formatNpr). */
  const money = useCallback(
    (amountNpr: number, opts?: { maximumFractionDigits?: number }) =>
      formatNpr(amountNpr, { maximumFractionDigits: opts?.maximumFractionDigits ?? 2 }),
    [formatNpr],
  )

  /** Format an NPR amount, stripping the leading symbol so it can be placed after a +/− sign. */
  const moneySigned = useCallback(
    (amountNpr: number, opts?: { maximumFractionDigits?: number }) =>
      formatNpr(amountNpr, { maximumFractionDigits: opts?.maximumFractionDigits ?? 2 }).replace(/^[^\d-]+/, ""),
    [formatNpr],
  )
  const calendarSystem = useCalendarSystem()
  /** Format an NPR amount compactly (NPR units when disabled, K/M/B/T when enabled). */
  const moneyCompact = useCallback(
    (amountNpr: number | null | undefined) => {
      if (amountNpr === null || amountNpr === undefined || !Number.isFinite(amountNpr)) return `${symbol}—`
      if (!enabled) return compactAmount(amountNpr, calendarSystem, 2)
      const converted = convertNpr(amountNpr)
      const abs = Math.abs(converted)
      const fmt = (v: number) => v.toLocaleString(getNumberFormatLocale(), { maximumFractionDigits: 2 })
      const scaled =
        abs >= 1e12 ? `${fmt(converted / 1e12)}T` :
        abs >= 1e9 ? `${fmt(converted / 1e9)}B` :
        abs >= 1e6 ? `${fmt(converted / 1e6)}M` :
        abs >= 1e3 ? `${fmt(converted / 1e3)}K` :
        `${fmt(converted)}`
      return `${symbol}${scaled}`
    },
    [enabled, convertNpr, symbol, calendarSystem],
  )

  return useMemo(
    () => ({
      enabled,
      currency,
      symbol,
      rate,
      via,
      isConverting,
      convertNpr,
      format,
      formatNpr,
      formatConverted,
      money,
      moneySigned,
      moneyCompact,
    }),
    [enabled, currency, symbol, rate, via, isConverting, convertNpr, format, formatNpr, formatConverted, money, moneySigned, moneyCompact],
  )
}
