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