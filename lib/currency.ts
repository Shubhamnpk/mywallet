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
  { value: "INR", label: "Indian Rupee (₹)", symbol: "₹", name: "Indian Rupee" },
  { value: "NPR", label: "Nepalese Rupee (रु)", symbol: "रु", name: "Nepalese Rupee" },
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

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string, customCurrency?: { symbol: string }): string {
  if (currencyCode === "CUSTOM" && customCurrency?.symbol) {
    return customCurrency.symbol
  }

  const currency = CURRENCIES.find(c => c.value === currencyCode)
  return currency?.symbol || "$"
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
  const symbol = getCurrencySymbol(currencyCode, customCurrency)
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
}

/**
 * Get currency object by code
 */
export function getCurrencyByCode(currencyCode: string): Currency | undefined {
  return CURRENCIES.find(c => c.value === currencyCode)
}