import type { PortfolioItem } from "@/types/wallet"

export const MARKET_SEARCH_PORTFOLIO_ID = "market-search"

export const isMarketSearchDetailItem = (item: PortfolioItem | null | undefined) =>
    item?.detailContext === "market-search" || item?.portfolioId === MARKET_SEARCH_PORTFOLIO_ID

