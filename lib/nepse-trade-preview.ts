export type NepseTradePreviewType = "buy" | "sell"

export type NepseHoldingTerm = "short" | "long" | "unknown"

export type NepseTradePreview = {
    shareAmount: number
    quantity: number
    costBasisPrice: number
    costBasisAmount: number
    brokerRate: number
    brokerCommission: number
    brokerVat: number
    totalCommission: number
    nepseCommission: number
    seboCommission: number
    regulatoryFee: number
    dpAmount: number
    nameTransferAmount: number
    capitalGainTaxRate: number
    holdingTerm: NepseHoldingTerm
    holdingPeriodMonths?: number
    taxableGain: number
    capitalGainTax: number
    totalCharges: number
    settlementAmount: number
    effectiveRate: number
}

const BROKER_MIN_COMMISSION = 10
const DP_CHARGE_PER_TRANSACTION = 25
const SEBO_COMMISSION_RATE = 0.00015
const SHORT_TERM_HOLDING_DAYS = 365
const BROKER_VAT_RATE = 0.26
const NEPSE_COMMISSION_SHARE_OF_TOTAL_COMMISSION = 0.2
const REGULATORY_FEE_SHARE_OF_NEPSE_COMMISSION = 0.03

const roundMoney = (value: number) => Math.round(value * 100) / 100

/**
 * Capital-gains tax rates on listed shares. The old law (in force before the
 * start of fiscal year 2083/84) charged 5% for holders and 7.5% for short-term
 * sellers. From Sharper 1, 2083 (2026-07-17) the rate rose to 7.5% long-term and
 * 10% short-term. The rate applied to a sale is the one in effect on the sale date.
 */
const NEPSE_LAW_CHANGE_DATE = new Date("2026-07-17T00:00:00")
const SHORT_TERM_CAPITAL_GAIN_TAX_RATE_OLD = 0.075
const LONG_TERM_CAPITAL_GAIN_TAX_RATE_OLD = 0.05
const SHORT_TERM_CAPITAL_GAIN_TAX_RATE_NEW = 0.1
const LONG_TERM_CAPITAL_GAIN_TAX_RATE_NEW = 0.075

const getNepseCapitalGainTaxRateByDate = (longTerm: boolean, sellTime?: number): number => {
    const isNewLaw = sellTime !== undefined && Number.isFinite(sellTime) && sellTime >= NEPSE_LAW_CHANGE_DATE.getTime()
    if (longTerm) return isNewLaw ? LONG_TERM_CAPITAL_GAIN_TAX_RATE_NEW : LONG_TERM_CAPITAL_GAIN_TAX_RATE_OLD
    return isNewLaw ? SHORT_TERM_CAPITAL_GAIN_TAX_RATE_NEW : SHORT_TERM_CAPITAL_GAIN_TAX_RATE_OLD
}

export interface SellLotFeeInput {
    id?: string
    quantity: number
    price: number
    date: string
}

export interface SellLotFeeBreakdown {
    id?: string
    gross: number
    fees: number
    tax: number
    totalCost: number
    net: number
    brokerRate: number
    taxRate: number
    holdingTerm: NepseHoldingTerm
}

export interface SellLotsFeeSummary {
    gross: number
    fees: number
    tax: number
    totalCost: number
    net: number
}

/**
 * Estimate the real outcome of sell lots by matching each sold share against
 * acquisition lots (buy / ipo / reinvestment) in FIFO order. Broker/exchange
 * fees are computed per sell lot; capital-gain tax is computed per matched
 * portion using the actual holding period and the two-tier rate.
 */
export const estimateSellLotsFees = (
    sells: SellLotFeeInput[],
    acquisitions: SellLotFeeInput[],
): { summary: SellLotsFeeSummary; lots: SellLotFeeBreakdown[] } => {
    const fifoQueue = acquisitions
        .filter((lot) => Number.isFinite(lot.quantity) && Number.isFinite(lot.price) && lot.quantity > 0 && lot.price > 0)
        .map((lot) => ({ remaining: lot.quantity, cost: lot.price, time: new Date(lot.date).getTime() }))
        .filter((lot) => Number.isFinite(lot.time))
        .sort((a, b) => a.time - b.time)

    const summary: SellLotsFeeSummary = { gross: 0, fees: 0, tax: 0, totalCost: 0, net: 0 }
    const lots: SellLotFeeBreakdown[] = []

    sells
        .filter((sell) => Number.isFinite(sell.quantity) && Number.isFinite(sell.price) && sell.quantity > 0 && sell.price > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach((sell) => {
            const quantity = sell.quantity
            const price = sell.price
            const sellTime = new Date(sell.date).getTime()

            // Fees are independent of cost basis - request the preview with cost basis 0 so tax is excluded.
            const preview = createNepseTradePreview(quantity, price, "sell", 0)
            const fees = preview.totalCharges
            const gross = preview.shareAmount
            const brokerRate = preview.brokerRate

            let remaining = quantity
            let fifoIndex = 0
            let tax = 0
            let longMatchedUnits = 0
            let shortMatchedUnits = 0
            while (remaining > 0 && fifoIndex < fifoQueue.length) {
                const lot = fifoQueue[fifoIndex]
                const consume = Math.min(remaining, lot.remaining)
                if (consume <= 0) {
                    fifoIndex += 1
                    continue
                }
                const grossPart = consume * price
                const costPart = consume * lot.cost
                const feePart = fees * (consume / quantity)
                const taxableGain = Math.max(0, grossPart - costPart - feePart)
                const daysHeld = Number.isFinite(sellTime) && Number.isFinite(lot.time)
                    ? (sellTime - lot.time) / (24 * 60 * 60 * 1000)
                    : 0
                const isLongTerm = daysHeld >= SHORT_TERM_HOLDING_DAYS
                if (isLongTerm) longMatchedUnits += consume
                else shortMatchedUnits += consume
                const rate = getNepseCapitalGainTaxRateByDate(isLongTerm, sellTime)
                tax += taxableGain * rate
                lot.remaining -= consume
                remaining -= consume
                if (lot.remaining <= 0) fifoIndex += 1
            }

            // Shares with no recorded cost basis - assume full gain at the long-term rate in force on the sale date.
            if (remaining > 0) {
                const grossPart = remaining * price
                const feePart = fees * (remaining / quantity)
                tax += Math.max(0, grossPart - feePart) * getNepseCapitalGainTaxRateByDate(true, sellTime)
            }

            const holdingTerm: NepseHoldingTerm = longMatchedUnits + shortMatchedUnits > 0
                ? (longMatchedUnits >= shortMatchedUnits ? "long" : "short")
                : "long"
            const applicableTaxRate = getNepseCapitalGainTaxRateByDate(holdingTerm === "long", sellTime)

            const totalCost = roundMoney(fees + tax)
            const net = roundMoney(gross - totalCost)
            summary.gross += gross
            summary.fees += fees
            summary.tax += tax
            summary.totalCost += totalCost
            summary.net += net
            lots.push({ id: sell.id, gross, fees, tax, totalCost, net, brokerRate, taxRate: applicableTaxRate, holdingTerm })
        })

    return { summary, lots }
}

export const getNepseBrokerCommissionRate = (shareAmount: number) => {
    if (shareAmount <= 50_000) return 0.0036
    if (shareAmount <= 500_000) return 0.0033
    if (shareAmount <= 2_000_000) return 0.0031
    if (shareAmount <= 10_000_000) return 0.0027
    return 0.0024
}

const toDate = (value?: Date | string | number): Date | null => {
    if (value === undefined || value === null || value === "") return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const getNepseCapitalGainTaxRate = (
    acquisitionDate?: Date | string | number,
    sellDate?: Date | string | number,
): { rate: number; holdingTerm: NepseHoldingTerm; holdingPeriodMonths?: number } => {
    const acquiredAt = toDate(acquisitionDate)
    const soldAt = toDate(sellDate) ?? new Date()
    if (!acquiredAt) {
        return { rate: getNepseCapitalGainTaxRateByDate(true, soldAt.getTime()), holdingTerm: "unknown" }
    }
    const holdingPeriodDays = Math.max(0, (soldAt.getTime() - acquiredAt.getTime()) / (24 * 60 * 60 * 1000))
    const holdingPeriodMonths = Math.max(0, Math.floor(holdingPeriodDays / 30.44))
    const isLongTerm = holdingPeriodDays >= SHORT_TERM_HOLDING_DAYS
    const rate = getNepseCapitalGainTaxRateByDate(isLongTerm, soldAt.getTime())
    return {
        rate,
        holdingTerm: isLongTerm ? "long" : "short",
        holdingPeriodMonths,
    }
}

export const createNepseTradePreview = (
    quantity: number,
    rate: number,
    type: NepseTradePreviewType,
    costBasisPrice = 0,
    acquisitionDate?: Date | string | number,
    sellDate?: Date | string | number,
): NepseTradePreview => {
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0
    const normalizedRate = Number.isFinite(rate) && rate > 0 ? rate : 0
    const normalizedCostBasisPrice = Number.isFinite(costBasisPrice) && costBasisPrice > 0 ? costBasisPrice : 0
    const shareAmount = roundMoney(normalizedQuantity * normalizedRate)
    const costBasisAmount = roundMoney(normalizedQuantity * normalizedCostBasisPrice)
    const brokerRate = getNepseBrokerCommissionRate(shareAmount)
    const totalCommission = shareAmount > 0
        ? roundMoney(Math.max(shareAmount * brokerRate, BROKER_MIN_COMMISSION))
        : 0
    const brokerCommission = totalCommission > 0
        ? roundMoney(totalCommission / (1 + BROKER_VAT_RATE))
        : 0
    const brokerVat = roundMoney(totalCommission - brokerCommission)
    const nepseCommission = roundMoney(totalCommission * NEPSE_COMMISSION_SHARE_OF_TOTAL_COMMISSION)
    const seboCommission = roundMoney(shareAmount * SEBO_COMMISSION_RATE)
    const regulatoryFee = roundMoney(nepseCommission * REGULATORY_FEE_SHARE_OF_NEPSE_COMMISSION)
    const dpAmount = shareAmount > 0 ? DP_CHARGE_PER_TRANSACTION : 0
    const nameTransferAmount = 0
    const { rate: capitalGainTaxRate, holdingTerm, holdingPeriodMonths } = type === "sell" && normalizedCostBasisPrice > 0
        ? getNepseCapitalGainTaxRate(acquisitionDate, sellDate)
        : { rate: 0, holdingTerm: "unknown" as NepseHoldingTerm, holdingPeriodMonths: undefined }
    const taxableGain = roundMoney(Math.max(
        type === "sell"
            ? shareAmount - costBasisAmount - totalCommission - seboCommission - dpAmount
            : 0,
        0,
    ))
    const capitalGainTax = roundMoney(taxableGain * capitalGainTaxRate)
    const customerFacingCharges = roundMoney(
        totalCommission +
        seboCommission +
        dpAmount +
        nameTransferAmount +
        capitalGainTax,
    )
    const effectiveSettlementAmount = roundMoney(
        type === "buy"
            ? shareAmount + totalCommission + seboCommission + nameTransferAmount
            : Math.max(shareAmount - totalCommission - seboCommission - nameTransferAmount - capitalGainTax, 0),
    )
    const totalCharges = roundMoney(
        customerFacingCharges,
    )
    const settlementAmount = roundMoney(
        type === "buy"
            ? effectiveSettlementAmount + dpAmount
            : Math.max(effectiveSettlementAmount - dpAmount, 0),
    )
    const effectiveRate = normalizedQuantity > 0
        ? roundMoney(effectiveSettlementAmount / normalizedQuantity)
        : 0

    return {
        shareAmount,
        quantity: normalizedQuantity,
        costBasisPrice: normalizedCostBasisPrice,
        costBasisAmount,
        brokerRate,
        brokerCommission,
        brokerVat,
        totalCommission,
        nepseCommission,
        seboCommission,
        regulatoryFee,
        dpAmount,
        nameTransferAmount,
        capitalGainTaxRate,
        holdingTerm,
        holdingPeriodMonths,
        taxableGain,
        capitalGainTax,
        totalCharges,
        settlementAmount,
        effectiveRate,
    }
}
