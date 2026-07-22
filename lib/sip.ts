import type { ShareTransaction, SIPPlan } from "@/types/wallet"
import type { CalendarSystem } from "@/lib/app-calendar"
import { formatAppDate } from "@/lib/app-calendar"
import * as XLSX from "xlsx"

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

export const resolveSipProviderQuote = (
  payload: Array<Record<string, any>> | null | undefined,
  symbol: string,
): { symbol: string; price: number; source: "provider" | "fallback" } | null => {
  const normalizedSymbol = (symbol || "").trim().toUpperCase()
  if (!normalizedSymbol) return null

  const entry = Array.isArray(payload)
    ? payload.find((item) => {
        const candidate = (item?.symbol ?? item?.scrip ?? item?.name ?? "").toString().trim().toUpperCase()
        return candidate === normalizedSymbol
      })
    : null

  if (!entry) return null

  const price = Number(entry?.ltp ?? entry?.close ?? entry?.price ?? entry?.last_traded_price ?? entry?.currentPrice ?? entry?.nav ?? entry?.latestNav)
  if (!Number.isFinite(price) || price <= 0) return null

  return {
    symbol: normalizedSymbol,
    price,
    source: "provider",
  }
}

const parseDelimitedRows = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line) =>
    line
      .split(/\t|,/)
      .map((cell) => cell.replace(/^['"]|['"]$/g, "").trim())
  )
}

export const extractSipProviderQuoteFromText = (
  text: string,
  symbol: string,
): { symbol: string; price: number; source: "provider" } | null => {
  const normalizedSymbol = (symbol || "").trim().toUpperCase()
  if (!normalizedSymbol) return null

  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return resolveSipProviderQuote(parsed as Array<Record<string, any>>, normalizedSymbol)
    }

    if (parsed && typeof parsed === "object") {
      const candidates: Array<Record<string, any>> = []
      if (Array.isArray((parsed as any).data)) {
        candidates.push(...((parsed as any).data as Array<Record<string, any>>))
      }
      candidates.push(parsed as Record<string, any>)
      return resolveSipProviderQuote(candidates, normalizedSymbol)
    }
  } catch {
    // fall through to delimited parsing
  }

  const rows = parseDelimitedRows(trimmed)
  if (rows.length === 0) return null

  const headerRow = rows[0].map((cell) => cell.toLowerCase())
  const records = rows.slice(1).map((row) => {
    if (row.length === 0) return null

    if (headerRow.some((cell) => /symbol|scrip|name/.test(cell))) {
      const record: Record<string, string> = {}
      headerRow.forEach((header, index) => {
        record[header] = row[index] || ""
      })
      return record
    }

    return {
      symbol: row[0] || "",
      ltp: row[1] || row[2] || row[3] || "",
      price: row[1] || row[2] || row[3] || "",
      close: row[1] || row[2] || row[3] || "",
    }
  }).filter(Boolean) as Array<Record<string, any>>

  return resolveSipProviderQuote(records, normalizedSymbol)
}

const toCsvValue = (value: unknown) => {
  const stringValue = value == null ? "" : String(value)
  return stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue
}

const getRowValue = (row: Record<string, any>, aliases: Array<string>) => {
  for (const alias of aliases) {
    const direct = row?.[alias]
    if (direct !== undefined && direct !== null && direct !== "") return direct

    const fallback = row?.[alias.toLowerCase()]
    if (fallback !== undefined && fallback !== null && fallback !== "") return fallback

    const camelCase = alias.replace(/\s+(.)/g, (_, letter) => letter.toUpperCase())
    const camelValue = row?.[camelCase]
    if (camelValue !== undefined && camelValue !== null && camelValue !== "") return camelValue
  }

  return ""
}

export const convertSipHistoryImportRowsToCsv = (rows: Array<Record<string, any>>) => {
  if (!Array.isArray(rows) || rows.length === 0) return ""

  const headerRow = [
    "Date",
    "Type",
    "Scheme",
    "BOID",
    "Name",
    "Units",
    "NAV Date",
    "NAV",
    "Total With NAV",
    "DP Fee",
    "SEBON Fee",
    "Entry Load",
    "Exit Load",
    "CGT",
    "Total Amount",
    "Gain",
    "Remainder",
    "Bal. Remainder",
  ]

  const csvRows = rows.map((row) => {
    const values = [
      getRowValue(row, ["Date", "date", "Transaction Date", "transactionDate", "transaction_date"]),
      getRowValue(row, ["Type", "type", "Transaction Type", "transactionType", "transaction_type", "History Description", "historyDescription", "history_description"]),
      getRowValue(row, ["Scheme", "scheme"]),
      getRowValue(row, ["BOID", "boid"]),
      getRowValue(row, ["Name", "name"]),
      getRowValue(row, ["Units", "units", "Credit Quantity", "creditQuantity", "credit_quantity", "Debit Quantity", "debitQuantity", "debit_quantity", "Balance After Transaction", "balanceAfterTransaction", "balance_after_transaction"]),
      getRowValue(row, ["NAV Date", "navDate", "nav_date", "NAV Date"]),
      getRowValue(row, ["NAV", "nav"]),
      getRowValue(row, ["Total With NAV", "totalWithNav", "total_with_nav"]),
      getRowValue(row, ["DP Fee", "dpFee", "dp_fee"]),
      getRowValue(row, ["SEBON Fee", "sebonFee", "sebon_fee"]),
      getRowValue(row, ["Entry Load", "entryLoad", "entry_load"]),
      getRowValue(row, ["Exit Load", "exitLoad", "exit_load"]),
      getRowValue(row, ["CGT", "cgt"]),
      getRowValue(row, ["Total Amount", "totalAmount", "total_amount"]),
      getRowValue(row, ["Gain", "gain"]),
      getRowValue(row, ["Remainder", "remainder"]),
      getRowValue(row, ["Bal. Remainder", "balRemainder", "balanceRemainder", "balance_remainder"]),
    ].map(toCsvValue)

    return values.join(",")
  })

  return [headerRow.join(","), ...csvRows].join("\n")
}

export const parseSipHistoryImportCsvRows = (csvContent: string) => {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const parseCsvLine = (line: string) => {
    const cells: string[] = []
    let current = ""
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current)
        current = ""
      } else {
        current += char
      }
    }

    cells.push(current)
    return cells.map((cell) => cell.trim())
  }

  const headerRow = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase())
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headerRow.map((header, index) => [header, values[index] ?? ""]))
  })
}

export const parseSipHistoryImportFileToCsv = async (file: File | Blob | ArrayBuffer | Uint8Array | Buffer | { name?: string; arrayBuffer?: () => Promise<ArrayBuffer>; buffer?: ArrayBuffer | Uint8Array | Buffer; text?: () => Promise<string> }): Promise<string> => {
  const name = typeof file === "object" && file && "name" in file && typeof (file as any).name === "string" ? (file as any).name : ""
  const extension = (name.split(".").pop() || "").toLowerCase()

  const readArrayBuffer = async () => {
    const tryRead = async (reader: () => Promise<ArrayBuffer | null | undefined>) => {
      try {
        const result = await reader()
        if (result && typeof result === "object" && typeof (result as any).byteLength === "number") {
          if (result instanceof ArrayBuffer) return result
          if (ArrayBuffer.isView(result)) {
            const view = result as Uint8Array
            return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
          }
          if (typeof (result as any).slice === "function") {
            return (result as any).slice(0, (result as any).byteLength)
          }
        }
      } catch {
        // Continue to the next fallback.
      }

      return null
    }

    const directReaders = [
      async () => {
        if (typeof (file as any).arrayBuffer === "function") {
          return (file as any).arrayBuffer()
        }
        return null
      },
      async () => {
        if (typeof FileReader !== "undefined" && typeof Blob !== "undefined" && (file instanceof Blob || (typeof (file as any).size === "number" && typeof (file as any).type === "string"))) {
          return await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as ArrayBuffer)
            reader.onerror = () => reject(reader.error)
            reader.readAsArrayBuffer(file as Blob)
          })
        }
        return null
      },
      async () => {
        if (typeof Response !== "undefined" && (file instanceof Blob || (typeof (file as any).size === "number" && typeof (file as any).type === "string"))) {
          return new Response(file as Blob).arrayBuffer()
        }
        return null
      },
      async () => {
        if (typeof Buffer !== "undefined" && (file as any) instanceof Buffer) {
          const buffer = file as Buffer
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        }
        return null
      },
      async () => {
        if (file instanceof ArrayBuffer) return file
        return null
      },
      async () => {
        if (ArrayBuffer.isView(file)) {
          const view = file as Uint8Array
          return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
        }
        return null
      },
      async () => {
        if (typeof (file as any).buffer !== "undefined") {
          const source = (file as any).buffer
          if (source && typeof source === "object" && typeof (source as any).byteLength === "number") {
            if (source instanceof ArrayBuffer) return source
            if (ArrayBuffer.isView(source)) {
              const view = source as Uint8Array
              return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
            }
            if (typeof (source as any).slice === "function") {
              return (source as any).slice(0, (source as any).byteLength)
            }
          }
        }
        return null
      },
    ]

    for (const reader of directReaders) {
      const result = await tryRead(reader)
      if (result) return result
    }

    return null
  }

  const arrayBuffer = await readArrayBuffer()
  if (arrayBuffer) {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const rows: Array<Record<string, any>> = workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName]
        if (!sheet) return []
        return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }) as Array<Record<string, any>>
      })

      if (rows.length > 0) {
        return convertSipHistoryImportRowsToCsv(rows)
      }
    } catch {
      try {
        const workbook = XLSX.read(arrayBuffer, { type: "buffer" as any })
        const rows: Array<Record<string, any>> = workbook.SheetNames.flatMap((sheetName) => {
          const sheet = workbook.Sheets[sheetName]
          if (!sheet) return []
          return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }) as Array<Record<string, any>>
        })

        if (rows.length > 0) {
          return convertSipHistoryImportRowsToCsv(rows)
        }
      } catch {
        // Fall back to text-based parsing for non-spreadsheet content.
      }
    }
  }

  if (extension === "xlsx" || extension === "xls" || extension === "xlsm") {
    throw new Error("The selected file could not be read as a spreadsheet")
  }

  if (typeof (file as any).text === "function") {
    return (file as any).text()
  }

  return ""
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

      // Exclude one-time purchases that aren't SIP installments
      if (tx.description?.toUpperCase().startsWith("ONE TIME PURCHASE")) {
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
