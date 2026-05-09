import NepaliDate from "nepali-date-converter"

export type CalendarSystem = "AD" | "BS"

export const DEFAULT_CALENDAR_SYSTEM: CalendarSystem = "AD"

export const getCalendarSystem = (value?: string | null): CalendarSystem =>
  value === "BS" ? "BS" : DEFAULT_CALENDAR_SYSTEM

export const toAdDateKey = (value: Date) => {
  const y = value.getFullYear()
  const m = `${value.getMonth() + 1}`.padStart(2, "0")
  const d = `${value.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${d}`
}

export const todayAdDateKey = () => toAdDateKey(new Date())

export const parseAdDate = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    const parsed = new Date(year, month, day)
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month &&
      parsed.getDate() === day
    ) {
      return parsed
    }
    return null
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const adToBsDateKey = (adDate?: string | Date | null) => {
  const parsed = adDate instanceof Date ? adDate : parseAdDate(adDate)
  if (!parsed) return ""
  const bs = new NepaliDate(parsed)
  const year = bs.getYear()
  const month = `${bs.getMonth() + 1}`.padStart(2, "0")
  const day = `${bs.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const bsToAdDateKey = (bsDate?: string | null) => {
  if (!bsDate) return ""
  const match = bsDate.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return ""

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 32) {
    return ""
  }

  try {
    return toAdDateKey(new NepaliDate(year, month - 1, day).toJsDate())
  } catch {
    return ""
  }
}

export const formatAppDate = (
  value?: string | Date | null,
  calendarSystem: CalendarSystem = DEFAULT_CALENDAR_SYSTEM,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) => {
  const parsed = value instanceof Date ? value : parseAdDate(value)
  if (!parsed) return "Not set"

  if (calendarSystem === "BS") {
    return new NepaliDate(parsed).format("DD MMMM YYYY")
  }

  return parsed.toLocaleDateString(undefined, options)
}

export const formatAppDateTime = (
  value?: string | Date | null,
  calendarSystem: CalendarSystem = DEFAULT_CALENDAR_SYSTEM,
  dateOptions: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
  timeOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
) => {
  const parsed = value instanceof Date ? value : parseAdDate(value)
  if (!parsed) return "Not set"

  return `${formatAppDate(parsed, calendarSystem, dateOptions)} ${parsed.toLocaleTimeString(undefined, timeOptions)}`
}

export const getCalendarMonthRange = (
  anchor: Date = new Date(),
  calendarSystem: CalendarSystem = DEFAULT_CALENDAR_SYSTEM,
  offset = 0,
) => {
  if (calendarSystem === "BS") {
    const anchorBs = new NepaliDate(anchor)
    let year = anchorBs.getYear()
    let month = anchorBs.getMonth() + offset

    year += Math.floor(month / 12)
    month %= 12
    if (month < 0) {
      month += 12
      year -= 1
    }

    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year

    return {
      start: new NepaliDate(year, month, 1).toJsDate(),
      end: new NepaliDate(nextYear, nextMonth, 1).toJsDate(),
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
    }
  }

  const start = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1)
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + offset + 1, 1)

  return {
    start,
    end,
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  }
}

export const isWithinDateRange = (value: string | Date | null | undefined, start: Date, end: Date) => {
  const parsed = value instanceof Date ? value : parseAdDate(value)
  if (!parsed) return false
  const time = parsed.getTime()
  return time >= start.getTime() && time < end.getTime()
}

export const isInCalendarMonth = (
  value: string | Date | null | undefined,
  anchor: Date = new Date(),
  calendarSystem: CalendarSystem = DEFAULT_CALENDAR_SYSTEM,
  offset = 0,
) => {
  const { start, end } = getCalendarMonthRange(anchor, calendarSystem, offset)
  return isWithinDateRange(value, start, end)
}

export const getCalendarMonthKey = (
  value: string | Date | null | undefined,
  calendarSystem: CalendarSystem = DEFAULT_CALENDAR_SYSTEM,
) => {
  const parsed = value instanceof Date ? value : parseAdDate(value)
  if (!parsed) return ""
  return getCalendarMonthRange(parsed, calendarSystem).key
}

export const formatAppMonthKey = (
  monthKey: string,
  calendarSystem: CalendarSystem = DEFAULT_CALENDAR_SYSTEM,
) => {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/)
  if (!match) return monthKey

  const year = Number(match[1])
  const month = Number(match[2])
  if (calendarSystem === "BS") {
    try {
      return new NepaliDate(year, month - 1, 1).format("MMMM YYYY")
    } catch {
      return monthKey
    }
  }

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}
