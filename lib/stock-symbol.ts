const STOCK_SYMBOL_ALIASES: Record<string, string> = {
  NMBSBFE: "NMBSBF",
}

export const normalizeStockSymbol = (symbol?: string): string => {
  const normalized = (symbol || "").trim().toUpperCase()
  return STOCK_SYMBOL_ALIASES[normalized] || normalized
}

