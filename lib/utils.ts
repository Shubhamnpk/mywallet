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

export function formatCurrency(amount: number, currency: string, customCurrency?: { code: string; symbol: string; name: string; }): string {
  const numberFormat = localStorage.getItem("wallet_number_format") || "us"
  const locale = numberFormat === 'us' ? 'en-US' : numberFormat === 'eu' ? 'de-DE' : 'en-IN'

  if (currency === "CUSTOM" && customCurrency) {
    return `${customCurrency.symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  const symbol = getCurrencySymbol(currency, customCurrency)
  if (symbol && symbol !== currency) {
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount)
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

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
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
