import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CURRENCIES } from "./currency"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} min${minutes !== 1 ? "s" : ""}`
  }
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`
}

export function formatCurrency(amount: number, currencyCode: string, customCurrency?: { symbol: string }): string {
  const numberFormat = typeof window !== 'undefined' ? (localStorage.getItem("wallet_number_format") || "us") : "us"
  const locale = numberFormat === 'us' ? 'en-US' : numberFormat === 'eu' ? 'de-DE' : 'en-IN'

  const symbol = getCurrencySymbol(currencyCode, customCurrency)
  return `${symbol}${amount.toLocaleString(locale, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`
}

export function getCurrencySymbol(
  currency: string | { code?: string; symbol?: string; name?: string } | undefined | null,
  custom?: { symbol?: string } | null,
): string {
  if (!currency) return "$"
  // If currency is an object (accidental or custom), prefer its symbol
  if (typeof currency === "object") {
    if (currency.symbol) return currency.symbol
    if (currency.code) return currency.code
    return "$"
  }

  if (currency === "CUSTOM" && custom && custom.symbol) return custom.symbol
  const currencyObj = CURRENCIES.find(c => c.value === currency)
  return currencyObj?.symbol || currency
}

export function generateId(prefix = ""): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function formatCurrencyLocalized(amount: number, currency: string, locale = "en-US", customCurrency?: { code: string; symbol: string; name: string; }): string {
  if (currency === "CUSTOM" && customCurrency) {
    return `${customCurrency.symbol}${amount.toFixed(2)}`
  }
  const symbol = getCurrencySymbol(currency, customCurrency)
  if (symbol && symbol !== currency) {
    return `${symbol}${amount.toFixed(2)}`
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function formatMoney(amount: number, currencySymbol?: string): string {
  const numberFormat = typeof window !== 'undefined' ? (localStorage.getItem("wallet_number_format") || "us") : "us"
  const locale = numberFormat === 'us' ? 'en-US' : numberFormat === 'eu' ? 'de-DE' : 'en-IN'
  const formatted = Math.abs(amount).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currencySymbol ? `${currencySymbol}${formatted}` : formatted
}
