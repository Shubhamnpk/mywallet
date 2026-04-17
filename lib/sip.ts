import type { ShareTransaction, SIPPlan } from "@/types/wallet"

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

const addMonths = (value: Date, months: number) => {
  const next = new Date(value)
  next.setMonth(next.getMonth() + months)
  return toStartOfDay(next)
}

const addFrequency = (value: Date, frequency: SIPPlan["frequency"]) => {
  if (frequency === "weekly") {
    return toStartOfDay(new Date(value.getTime() + (7 * DAY_MS)))
  }
  if (frequency === "quarterly") {
    return addMonths(value, 3)
  }
  return addMonths(value, 1)
}

export const formatSipDate = (value?: string | null) => {
  const parsed = parseDateOnly(value)
  if (!parsed) return "Not set"
  return parsed.toLocaleDateString(undefined, {
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

export const getSipNextInstallmentDate = (
  plan: Pick<SIPPlan, "startDate" | "frequency">,
  now = new Date(),
) => {
  const start = parseDateOnly(plan.startDate)
  if (!start) return null

  const today = toStartOfDay(now)
  let next = start
  let safety = 0
  while (next < today && safety < 500) {
    next = addFrequency(next, plan.frequency)
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

  let next = start
  let cursor = 0
  while (cursor < index) {
    next = addFrequency(next, plan.frequency)
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

    cursor = addFrequency(cursor, plan.frequency)
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
