import type { ShareTransaction, SIPPlan } from "@/types/wallet"
import type { CalendarSystem } from "@/lib/app-calendar"
import { formatAppDate } from "@/lib/app-calendar"

const DAY_MS = 24 * 60 * 60 * 1000
export const SIP_DEFAULT_DPS_CHARGE = 5

export const SIP_REMINDER_DAY_OPTIONS = [1, 3, 7] as const

const toStartOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())

/** YYYY-MM-DD in the user's local calendar. Never use toISOString().slice(0, 10) — that is UTC and shifts dates in most time zones. */
const toLocalDateKey = (value: Date) => {
  const y = value.getFullYear()
  const m = `${value.getMonth() + 1}`.padStart(2, "0")
  const d = `${value.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${d}`
}

const parseDateOnly = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  // Plain calendar date: interpret as local civil date (Date("YYYY-MM-DD") is UTC midnight and wrong for many zones).
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [ys, ms, ds] = trimmed.split("-")
    const y = Number(ys)
    const mo = Number(ms) - 1
    const d = Number(ds)
    if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null
    const parsed = new Date(y, mo, d)
    if (parsed.getFullYear() !== y || parsed.getMonth() !== mo || parsed.getDate() !== d) return null
    return toStartOfDay(parsed)
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return toStartOfDay(parsed)
}

const addMonths = (value: Date, months: number, anchorDay = value.getDate()) => {
  const year = value.getFullYear()
  const month = value.getMonth()

  const targetMonthIndex = month + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedTargetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(targetYear, normalizedTargetMonth + 1, 0).getDate()

  return toStartOfDay(new Date(targetYear, normalizedTargetMonth, Math.min(anchorDay, lastDayOfTargetMonth)))
}

const addFrequency = (value: Date, frequency: SIPPlan["frequency"], anchorDay = value.getDate()) => {
  if (frequency === "weekly") {
    return toStartOfDay(new Date(value.getTime() + (7 * DAY_MS)))
  }
  if (frequency === "quarterly") {
    return addMonths(value, 3, anchorDay)
  }
  return addMonths(value, 1, anchorDay)
}

export const formatSipDate = (value?: string | null, calendarSystem: CalendarSystem = "AD") => {
  const parsed = parseDateOnly(value)
  if (!parsed) return "Not set"
  return formatAppDate(parsed, calendarSystem, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export const calculateSipNetInvestment = (grossAmount: number, dpsCharge = SIP_DEFAULT_DPS_CHARGE) => {
  const normalizedGross = Number.isFinite(grossAmount) ? grossAmount : 0
  const normalizedCharge = Math.max(0, Number.isFinite(dpsCharge) ? dpsCharge : SIP_DEFAULT_DPS_CHARGE)
  return Math.max(0, normalizedGross - normalizedCharge)
}

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

export const getSipNextInstallmentDate = (
  plan: Pick<SIPPlan, "startDate" | "frequency">,
  now = new Date(),
) => {
  const start = parseDateOnly(plan.startDate)
  if (!start) return null

  const today = toStartOfDay(now)
  const anchorDay = start.getDate()
  let next = start
  let safety = 0
  while (next <= today && safety < 500) {
    next = addFrequency(next, plan.frequency, anchorDay)
    safety += 1
  }
  return next
}

export const getSipDueDateAtIndex = (
  plan: Pick<SIPPlan, "startDate" | "frequency">,
  index: number,
) => {
  const start = parseDateOnly(plan.startDate)
  if (!start || index < 0) return null

  const anchorDay = start.getDate()
  let next = start
  let cursor = 0
  while (cursor < index) {
    next = addFrequency(next, plan.frequency, anchorDay)
    cursor += 1
  }
  return next
}

export const normalizeSipPlans = (plans?: SIPPlan[] | null): SIPPlan[] => {
  if (!Array.isArray(plans)) return []

  return plans
    .filter((plan): plan is SIPPlan => Boolean(plan && typeof plan === "object" && typeof plan.id === "string" && typeof plan.symbol === "string"))
    .map((plan) => ({
      ...plan,
      assetType: "stock",
      frequency: plan.frequency === "weekly" || plan.frequency === "quarterly" ? plan.frequency : "monthly",
      reminderDays: SIP_REMINDER_DAY_OPTIONS.includes(plan.reminderDays as (typeof SIP_REMINDER_DAY_OPTIONS)[number]) ? plan.reminderDays : 3,
      mode: plan.mode === "auto" ? "auto" : "manual",
      status: plan.status === "paused" ? "paused" : "active",
      dpsCharge: Number.isFinite(plan.dpsCharge) ? Math.max(0, plan.dpsCharge ?? SIP_DEFAULT_DPS_CHARGE) : SIP_DEFAULT_DPS_CHARGE,
      installmentAmount: Number.isFinite(plan.installmentAmount) ? plan.installmentAmount : 0,
      estimatedUnits: Number.isFinite(plan.estimatedUnits) ? plan.estimatedUnits : undefined,
      referencePrice: Number.isFinite(plan.referencePrice) ? plan.referencePrice : undefined,
      notes: plan.notes?.trim() || undefined,
      lastRemainder: Number.isFinite(plan.lastRemainder) ? plan.lastRemainder : 0,
      lastInstallmentDate: plan.lastInstallmentDate || undefined,
    }))
}

export const getSipTransactionsForPlan = (
  plan: Pick<SIPPlan, "id" | "portfolioId" | "symbol">,
  transactions: ShareTransaction[] | undefined,
) => {
  const normalizedSymbol = plan.symbol.trim().toUpperCase()
  return (transactions || [])
    .filter((tx) =>
      tx.portfolioId === plan.portfolioId &&
      tx.symbol.trim().toUpperCase() === normalizedSymbol &&
      tx.sipPlanId === plan.id,
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const getSipDisplayTransactionsForPlan = (
  plan: Pick<SIPPlan, "id" | "portfolioId" | "symbol" | "startDate">,
  transactions: ShareTransaction[] | undefined,
) => {
  const normalizedSymbol = plan.symbol.trim().toUpperCase()
  const planStartTime = parseDateOnly(plan.startDate)?.getTime() ?? Number.NEGATIVE_INFINITY

  return (transactions || [])
    .filter((tx) => {
      if (tx.portfolioId !== plan.portfolioId || tx.symbol.trim().toUpperCase() !== normalizedSymbol) {
        return false
      }

      if (tx.sipPlanId === plan.id) {
        return true
      }

      if (tx.type !== "buy") {
        return false
      }

      const txTime = parseDateOnly(tx.date)?.getTime() ?? Number.NEGATIVE_INFINITY
      return txTime >= planStartTime
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

const getCompletedDueDateSet = (
  plan: Pick<SIPPlan, "id" | "portfolioId" | "symbol">,
  transactions: ShareTransaction[] | undefined,
) => {
  const completedDueDates = new Set<string>()
  getSipTransactionsForPlan(plan, transactions).forEach((tx) => {
    const parsed = parseDateOnly(tx.sipDueDate || tx.date)
    if (parsed) {
      completedDueDates.add(toLocalDateKey(parsed))
    }
  })
  return completedDueDates
}

export const getSipScheduleSummary = (
  plan: Pick<SIPPlan, "id" | "portfolioId" | "symbol" | "startDate" | "frequency" | "reminderDays">,
  transactions: ShareTransaction[] | undefined,
  now = new Date(),
) => {
  const today = toStartOfDay(now)
  const start = parseDateOnly(plan.startDate)
  if (!start) return null

  const completedDueDates = getCompletedDueDateSet(plan, transactions)
  const anchorDay = start.getDate()

  let cursor = start
  let latestPendingOnOrBeforeToday: Date | null = null
  let nextFuturePending: Date | null = null
  let safety = 0
  while (safety < 500) {
    const dueKey = toLocalDateKey(cursor)
    const isCompleted = completedDueDates.has(dueKey)

    if (!isCompleted) {
      if (cursor <= today) {
        latestPendingOnOrBeforeToday = cursor
      } else {
        nextFuturePending = cursor
        break
      }
    }

    cursor = addFrequency(cursor, plan.frequency, anchorDay)
    safety += 1
  }

  const actionableDate = latestPendingOnOrBeforeToday || nextFuturePending
  if (!actionableDate) return null

  const daysUntilNext = Math.round((actionableDate.getTime() - today.getTime()) / DAY_MS)
  const previousDate = latestPendingOnOrBeforeToday && latestPendingOnOrBeforeToday < today
    ? latestPendingOnOrBeforeToday
    : null
  const daysSincePrevious = previousDate
    ? Math.round((today.getTime() - previousDate.getTime()) / DAY_MS)
    : null

  return {
    nextDate: actionableDate,
    previousDate,
    daysUntilNext,
    daysSincePrevious,
    isOverdue: daysUntilNext < 0,
    shouldSendUpcomingReminder: daysUntilNext > 0 && daysUntilNext <= plan.reminderDays,
    isDueToday: daysUntilNext === 0,
    isRecentlyMissed: daysSincePrevious !== null && daysSincePrevious > 0 && daysSincePrevious <= Math.max(2, plan.reminderDays),
  }
}

export const getSipCompletedTransactionForDueDate = (
  plan: Pick<SIPPlan, "id" | "portfolioId" | "symbol">,
  transactions: ShareTransaction[] | undefined,
  dueDate: Date | string | null,
) => {
  const target = typeof dueDate === "string" ? parseDateOnly(dueDate) : dueDate ? toStartOfDay(dueDate) : null
  if (!target) return null
  const targetKey = toLocalDateKey(target)

  return getSipTransactionsForPlan(plan, transactions).find((tx) => {
    const parsed = parseDateOnly(tx.sipDueDate || tx.date)
    return parsed && toLocalDateKey(parsed) === targetKey
  }) || null
}
