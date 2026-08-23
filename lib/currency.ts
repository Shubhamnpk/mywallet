export interface Currency {
  value: string
  label: string
  symbol: string
  name: string
}

export const CURRENCIES: Currency[] = [
  { value: "USD", label: "US Dollar ($)", symbol: "$", name: "US Dollar" },
  { value: "EUR", label: "Euro (€)", symbol: "€", name: "Euro" },
  { value: "GBP", label: "British Pound (£)", symbol: "£", name: "British Pound" },
  { value: "JPY", label: "Japanese Yen (¥)", symbol: "¥", name: "Japanese Yen" },
  { value: "CAD", label: "Canadian Dollar (C$)", symbol: "C$", name: "Canadian Dollar" },
  { value: "AUD", label: "Australian Dollar (A$)", symbol: "A$", name: "Australian Dollar" },
  { value: "INR", label: "Indian Rupee (₹)", symbol: "₹ ", name: "Indian Rupee" },
  { value: "NPR", label: "Nepalese Rupee (रु)", symbol: "रु ", name: "Nepalese Rupee" },
  { value: "CUSTOM", label: "Custom Currency", symbol: "", name: "Custom Currency" },
]

export const ONBOARDING_CURRENCIES = [
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'CAD', label: '$ CAD' },
  { value: 'AUD', label: '$ AUD' },
  { value: 'NPR', label: 'रु NPR' },
]

export function getNumberFormatLocale(): string {
  if (typeof window === 'undefined') return 'en-US'
  const format = localStorage.getItem("wallet_number_format") || "us"
  return format === 'us' ? 'en-US' : format === 'eu' ? 'de-DE' : 'en-IN'
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(
  currency: string | { code?: string; symbol?: string; name?: string } | undefined | null,
  custom?: { symbol?: string } | null,
): string {
  if (!currency) return "$"
  if (typeof currency === "object") {
    if (currency.symbol) return currency.symbol
    if (currency.code) return currency.code
    return "$"
  }

  if (currency === "CUSTOM" && custom && custom.symbol) return custom.symbol
  const currencyObj = CURRENCIES.find(c => c.value === currency)
  return currencyObj?.symbol || currency
}

/**
 * Get currency name for a given currency code
 */
export function getCurrencyName(currencyCode: string, customCurrency?: { name: string }): string {
  if (currencyCode === "CUSTOM" && customCurrency?.name) {
    return customCurrency.name
  }

  const currency = CURRENCIES.find(c => c.value === currencyCode)
  return currency?.name || "US Dollar"
}

/**
 * Get currency label for a given currency code
 */
export function getCurrencyLabel(currencyCode: string, customCurrency?: { name: string; symbol: string }): string {
  if (currencyCode === "CUSTOM" && customCurrency) {
    return `${customCurrency.name} (${customCurrency.symbol})`
  }

  const currency = CURRENCIES.find(c => c.value === currencyCode)
  return currency?.label || "US Dollar ($)"
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currencyCode: string, customCurrency?: { symbol: string }): string {
  const locale = getNumberFormatLocale()
  const symbol = getCurrencySymbol(currencyCode, customCurrency)
  return `${symbol}${amount.toLocaleString(locale, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`
}

/**
 * Get locale for a given currency code
 */
export function getLocaleForCurrency(currencyCode: string): string {
  switch (currencyCode) {
    case "NPR":
      return "ne-NP"
    case "USD":
    default:
      return "en-US"
  }
}

/**
 * Get currency object by code
 */
export function getCurrencyByCode(currencyCode: string): Currency | undefined {
  return CURRENCIES.find(c => c.value === currencyCode)
}

/**
 * Fixed 1 NPR = X {currency} rates used when a live quote isn't available.
 * 1 INR = 1.6 NPR  =>  1 NPR = 0.625 INR
 */
const FIXED_NPR_RATES: Record<string, number> = {
  INR: 1 / 1.6,
}

interface UsdRates {
  usdToNpr: number
  usdToTarget: number
}

/**
 * Fetch live 1 USD -> NPR and 1 USD -> {target} rates from the same public API
 * response so the cross-rate is consistent. Returns null if unavailable.
 */
async function fetchUsdCrossRates(target: string): Promise<UsdRates | null> {
  const sources = [
    "https://api.exchangerate-api.com/v4/latest/USD",
    "https://open.er-api.com/v6/latest/USD",
    "https://api.frankfurter.app/latest?from=USD",
  ]
  for (const url of sources) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      const data = (await res.json()) as Record<string, any>
      const rates = data.rates ?? data.conversion_rates ?? data.data
      const readRate = (code: string): number => {
        const v = rates?.[code]
        if (typeof v === "number") return v
        if (v && typeof v.value === "number") return v.value
        return 0
      }
      const npr = readRate("NPR")
      const targetRate = readRate(target)
      if (npr > 0 && targetRate > 0) return { usdToNpr: npr, usdToTarget: targetRate }
    } catch {
      // try the next source
    }
  }
  return null
}

/**
 * Resolve how many units of `toCurrency` equal 1 NPR.
 * - NPR: 1
 * - INR: fixed 0.625 (1 INR = 1.6 NPR)
 * - other: live cross-rate = usdToTarget / usdToNpr
 *   (e.g. 1 NPR = 0.78 GBP per USD / 134 NPR per USD = 0.00582 GBP),
 *   using caller-provided cell rates if given, otherwise fetching live.
 */
export async function getNprToCurrencyRate(params: {
  toCurrency: string
  usdPerTo?: number
  usdToNpr?: number
}): Promise<{ rate: number; via: "fixed" | "live" }> {
  const target = (params.toCurrency || "USD").toUpperCase()
  if (target === "NPR") return { rate: 1, via: "fixed" }

  if (FIXED_NPR_RATES[target]) return { rate: FIXED_NPR_RATES[target], via: "fixed" }

  let nprPerUsd = params.usdToNpr && Number.isFinite(params.usdToNpr) && params.usdToNpr > 0
    ? params.usdToNpr
    : 0
  let targetPerUsd = params.usdPerTo && Number.isFinite(params.usdPerTo) && params.usdPerTo > 0
    ? params.usdPerTo
    : 0

  if (nprPerUsd <= 0 || targetPerUsd <= 0) {
    const live = await fetchUsdCrossRates(target)
    if (!live) return { rate: 0, via: "fixed" }
    if (nprPerUsd <= 0) nprPerUsd = live.usdToNpr
    if (targetPerUsd <= 0) targetPerUsd = live.usdToTarget
  }

  const cross = targetPerUsd / nprPerUsd
  if (!(cross > 0)) return { rate: 0, via: "fixed" }
  return { rate: cross, via: "live" }
}