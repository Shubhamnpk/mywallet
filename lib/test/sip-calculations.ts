import type { ShareTransaction, SIPPlan } from "@/types/wallet"
import { SIP_DEFAULT_DPS_CHARGE, calculateSipNetInvestment } from "@/lib/sip"

export type SipCycleAmounts = {
  baseAmount: number
  carryRemainder: number
  grossAmount: number
  dpsCharge: number
  netAmount: number
}

export type SipExecutionPlan = SipCycleAmounts & {
  currentPrice: number
  quantity: number
  remainder: number
}

export const getSipCharge = (plan?: Pick<SIPPlan, "dpsCharge"> | null) =>
  Number.isFinite(plan?.dpsCharge) ? Math.max(0, Number(plan?.dpsCharge)) : SIP_DEFAULT_DPS_CHARGE

export const getSipBaseAmount = (plan?: Pick<SIPPlan, "installmentAmount"> | null) =>
  Number.isFinite(plan?.installmentAmount) ? Number(plan?.installmentAmount) : 0

export const getSipCarryRemainder = (plan?: Pick<SIPPlan, "lastRemainder"> | null) =>
  Number.isFinite(plan?.lastRemainder) ? Number(plan?.lastRemainder) : 0

export const getSipCycleAmounts = (
  plan?: Pick<SIPPlan, "installmentAmount" | "dpsCharge" | "lastRemainder"> | null,
  overrides?: { baseAmount?: number; includeCarryRemainder?: boolean },
): SipCycleAmounts => {
  const baseAmount = Number.isFinite(overrides?.baseAmount) && (overrides?.baseAmount ?? 0) > 0
    ? Number(overrides?.baseAmount)
    : getSipBaseAmount(plan)
  const carryRemainder = overrides?.includeCarryRemainder === false ? 0 : getSipCarryRemainder(plan)
  const grossAmount = Number((baseAmount + carryRemainder).toFixed(2))
  const dpsCharge = getSipCharge(plan)
  const netAmount = Number(calculateSipNetInvestment(grossAmount, dpsCharge).toFixed(2))

  return {
    baseAmount,
    carryRemainder,
    grossAmount,
    dpsCharge,
    netAmount,
  }
}

export const getSipTransactionGrossAmount = (tx: Pick<ShareTransaction, "type" | "price" | "quantity" | "sipGrossAmount" | "sipDpsCharge">) => {
  if (Number.isFinite(tx.sipGrossAmount)) return Number(tx.sipGrossAmount)
  if (tx.type === "buy") {
    const price = Number.isFinite(tx.price) ? Number(tx.price) : 0
    const quantity = Number.isFinite(tx.quantity) ? Number(tx.quantity) : 0
    return Number(((price * quantity) + (Number.isFinite(tx.sipDpsCharge) ? Number(tx.sipDpsCharge) : SIP_DEFAULT_DPS_CHARGE)).toFixed(2))
  }
  return 0
}

export const getSipTransactionNetAmount = (tx: Pick<ShareTransaction, "sipNetAmount" | "sipDpsCharge" | "sipGrossAmount" | "type" | "price" | "quantity">) => {
  if (Number.isFinite(tx.sipNetAmount)) return Number(tx.sipNetAmount)
  return Number(calculateSipNetInvestment(getSipTransactionGrossAmount(tx), Number.isFinite(tx.sipDpsCharge) ? Number(tx.sipDpsCharge) : SIP_DEFAULT_DPS_CHARGE).toFixed(2))
}

export const isSipEnrollmentCandidate = (tx: Pick<ShareTransaction, "type" | "quantity" | "sipPlanId">) => {
  const isBuyType = tx.type === "buy" || tx.type === "ipo" || tx.type === "merger_in"
  const hasValidQuantity = Number.isFinite(tx.quantity) && (tx.quantity ?? 0) > 0
  return isBuyType && !tx.sipPlanId && hasValidQuantity
}

export const canSipCycleBuyUnit = (
  plan: Pick<SIPPlan, "installmentAmount" | "dpsCharge" | "lastRemainder"> | null | undefined,
  currentPrice: number,
  overrides?: { baseAmount?: number },
) => {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false
  const amounts = getSipCycleAmounts(plan, overrides)
  return amounts.netAmount >= currentPrice
}

export const buildSipExecutionPlan = (
  plan: Pick<SIPPlan, "installmentAmount" | "dpsCharge" | "lastRemainder">,
  currentPrice: number,
  overrides?: { baseAmount?: number },
): SipExecutionPlan => {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error("A valid SIP execution price is required")
  }

  const amounts = getSipCycleAmounts(plan, overrides)
  if (!Number.isFinite(amounts.grossAmount) || amounts.grossAmount <= 0) {
    throw new Error("A valid SIP installment amount is required")
  }

  if (amounts.netAmount < currentPrice) {
    throw new Error("Net SIP amount after DPS is not enough to buy at least one unit at the current price")
  }

  const quantity = Math.floor(amounts.netAmount / currentPrice)
  if (quantity < 1) {
    throw new Error("Installment amount is not enough to complete this SIP installment")
  }

  const remainder = Number((amounts.netAmount - (quantity * currentPrice)).toFixed(2))

  return {
    ...amounts,
    currentPrice: Number(currentPrice),
    quantity,
    remainder,
  }
}
