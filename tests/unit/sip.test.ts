import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { getSipDueDateAtIndex, getSipScheduleSummary, parseSipHistoryImportFileToCsv, resolveSipProviderQuote } from "@/lib/sip"

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

  it("resolves the latest quote for a symbol from provider payloads", () => {
    const payload = [
      { symbol: "NABIL", ltp: 950 },
      { symbol: "HBL", ltp: 720 },
    ]

    expect(resolveSipProviderQuote(payload, "nabil")).toEqual({
      symbol: "NABIL",
      price: 950,
      source: "provider",
    })
  })

  it("normalizes transaction-history rows from the provided Excel workbook", async () => {
    const filePath = resolve(process.cwd(), "public/demo data/mutalfund.xlsx")
    const file = new File([readFileSync(filePath)], "mutalfund.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main",
    })

    const csv = await parseSipHistoryImportFileToCsv(file)

    expect(csv).toContain("SIP Installment")
    expect(csv).toContain("Nabil Flexi Cap Fund")
    expect(csv).toContain("1491.28")
  })
})
