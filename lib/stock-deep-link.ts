export const STOCK_DEEP_LINK_EVENT = "mywallet:open-stock"

export type StockDeepLinkPayload = {
  symbol: string
  portfolioId?: string | null
  tab?: string
}

export function dispatchStockDeepLink(payload: StockDeepLinkPayload): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<StockDeepLinkPayload>(STOCK_DEEP_LINK_EVENT, { detail: payload }))
}

export function buildStockDeepLinkUrl(payload: StockDeepLinkPayload): string {
  const params = new URLSearchParams()
  params.set("tab", "portfolio")
  params.set("stock", payload.symbol)
  if (payload.portfolioId) params.set("portfolio", payload.portfolioId)
  if (payload.tab) params.set("stockTab", payload.tab)
  return `/?${params.toString()}`
}
