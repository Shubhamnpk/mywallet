import { describe, expect, it } from "vitest"
import { getSipDueDateAtIndex, getSipScheduleSummary } from "../sip"

const toLocalDateKey = (value: Date | null | undefined) =>
  value
    ? `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}-${`${value.getDate()}`.padStart(2, "0")}`
    : null

describe("sip schedule logic", () => {
  it("keeps monthly SIP plans anchored to month-end dates", () => {
    const plan = {
      startDate: "2026-01-31",
      frequency: "monthly" as const,
    }

    expect(toLocalDateKey(getSipDueDateAtIndex(plan, 0))).toBe("2026-01-31")
    expect(toLocalDateKey(getSipDueDateAtIndex(plan, 1))).toBe("2026-02-28")
    expect(toLocalDateKey(getSipDueDateAtIndex(plan, 2))).toBe("2026-03-31")
    expect(toLocalDateKey(getSipDueDateAtIndex(plan, 3))).toBe("2026-04-30")
  })

  it("keeps quarterly SIP plans anchored after short months", () => {
    const plan = {
      startDate: "2026-08-31",
      frequency: "quarterly" as const,
    }

    expect(toLocalDateKey(getSipDueDateAtIndex(plan, 1))).toBe("2026-11-30")
    expect(toLocalDateKey(getSipDueDateAtIndex(plan, 2))).toBe("2027-02-28")
    expect(toLocalDateKey(getSipDueDateAtIndex(plan, 3))).toBe("2027-05-31")
  })

  it("reports the latest overdue unpaid cycle instead of drifting to a later month", () => {
    const plan = {
      id: "sip-1",
      portfolioId: "portfolio-1",
      symbol: "NABIL",
      startDate: "2026-01-31",
      frequency: "monthly" as const,
      reminderDays: 3,
    }

    const schedule = getSipScheduleSummary(plan, [], new Date("2026-03-15T09:00:00"))

    expect(schedule?.isOverdue).toBe(true)
    expect(schedule?.isDueToday).toBe(false)
    expect(toLocalDateKey(schedule?.nextDate)).toBe("2026-02-28")
    expect(schedule?.previousDate).not.toBeNull()
    expect(toLocalDateKey(schedule?.previousDate)).toBe("2026-02-28")
  })
})
