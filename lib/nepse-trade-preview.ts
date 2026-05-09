export type NepseTradePreviewType = "buy" | "sell"

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
    taxableGain: number
    capitalGainTax: number
    totalCharges: number
    settlementAmount: number
    effectiveRate: number
}

const BROKER_MIN_COMMISSION = 10
const DP_CHARGE_PER_TRANSACTION = 25
const SEBO_COMMISSION_RATE = 0.00015
const DEFAULT_CAPITAL_GAIN_TAX_RATE = 0.05
const BROKER_VAT_RATE = 0.26
const NEPSE_COMMISSION_SHARE_OF_TOTAL_COMMISSION = 0.2
const REGULATORY_FEE_SHARE_OF_NEPSE_COMMISSION = 0.03

const roundMoney = (value: number) => Math.round(value * 100) / 100

export const getNepseBrokerCommissionRate = (shareAmount: number) => {
    if (shareAmount <= 50_000) return 0.0036
    if (shareAmount <= 500_000) return 0.0033
    if (shareAmount <= 2_000_000) return 0.0031
    if (shareAmount <= 10_000_000) return 0.0027
    return 0.0024
}

export const createNepseTradePreview = (
    quantity: number,
    rate: number,
    type: NepseTradePreviewType,
    costBasisPrice = 0,
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
    const capitalGainTaxRate = type === "sell" && normalizedCostBasisPrice > 0 ? DEFAULT_CAPITAL_GAIN_TAX_RATE : 0
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
        taxableGain,
        capitalGainTax,
        totalCharges,
        settlementAmount,
        effectiveRate,
    }
}
