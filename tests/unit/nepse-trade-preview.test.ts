import { describe, expect, it } from "vitest"

import { estimateSellLotsFees, getNepseCapitalGainTaxRate } from "@/lib/nepse-trade-preview"

describe("nepse-trade-preview capital gains tax rates", () => {
    it("uses the old 5% long-term rate for sales before the 2083/84 law change", () => {
        const result = getNepseCapitalGainTaxRate(new Date("2024-01-01"), new Date("2025-02-01"))
        expect(result.rate).toBe(0.05)
        expect(result.holdingTerm).toBe("long")
    })

    it("uses the old 7.5% short-term rate before the 2083/84 law change", () => {
        const result = getNepseCapitalGainTaxRate(new Date("2024-01-01"), new Date("2024-06-01"))
        expect(result.rate).toBe(0.075)
        expect(result.holdingTerm).toBe("short")
    })

    it("uses the new 7.5% long-term rate after the 2083/84 law change", () => {
        const result = getNepseCapitalGainTaxRate(new Date("2025-01-01"), new Date("2026-08-01"))
        expect(result.rate).toBe(0.075)
        expect(result.holdingTerm).toBe("long")
    })

    it("uses the new 10% short-term rate after the 2083/84 law change", () => {
        const result = getNepseCapitalGainTaxRate(new Date("2026-01-01"), new Date("2026-08-01"))
        expect(result.rate).toBe(0.1)
        expect(result.holdingTerm).toBe("short")
    })

    it("falls back to the new long-term rate when the acquisition date is unknown", () => {
        const result = getNepseCapitalGainTaxRate(undefined, new Date("2026-08-01"))
        expect(result.rate).toBe(0.075)
        expect(result.holdingTerm).toBe("unknown")
    })
})

describe("estimateSellLotsFees", () => {
    it("taxes unmatched shares at the long-term rate in force on the sale date", () => {
        const oldLaw = estimateSellLotsFees(
            [{ quantity: 10, price: 100, date: "2025-01-10" }],
            [],
        )
        expect(oldLaw.summary.tax).toBeCloseTo((1000 - oldLaw.summary.fees) * 0.05, 2)

        const newLaw = estimateSellLotsFees(
            [{ quantity: 10, price: 100, date: "2026-08-10" }],
            [],
        )
        expect(newLaw.summary.tax).toBeCloseTo((1000 - newLaw.summary.fees) * 0.075, 2)
    })

    it("reports the applicable rate bracket even when there is no taxable gain", () => {
        const result = estimateSellLotsFees(
            [{ quantity: 10, price: 100, date: "2025-06-01" }],
            [{ quantity: 10, price: 150, date: "2024-01-01" }],
        )
        const lot = result.lots[0]
        expect(lot.tax).toBe(0)
        expect(lot.taxRate).toBe(0.05)
        expect(lot.holdingTerm).toBe("long")
    })
})