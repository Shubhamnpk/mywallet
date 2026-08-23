import { describe, expect, it, vi, afterEach } from "vitest"

import { getNprToCurrencyRate } from "@/lib/currency"

describe("getNprToCurrencyRate", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("returns 1 for NPR", async () => {
        const result = await getNprToCurrencyRate({ toCurrency: "NPR" })
        expect(result.rate).toBe(1)
        expect(result.via).toBe("fixed")
    })

    it("uses fixed rate for INR (1 NPR = 0.625 INR)", async () => {
        const result = await getNprToCurrencyRate({ toCurrency: "INR" })
        expect(result.rate).toBeCloseTo(1 / 1.6, 5)
        expect(result.via).toBe("fixed")
    })

    it("computes a correct live cross-rate from provided cell rates", async () => {
        const result = await getNprToCurrencyRate({
            toCurrency: "GBP",
            usdPerTo: 0.78,
            usdToNpr: 134,
        })
        // 1 NPR = usdToTarget / usdToNpr = 0.78 / 134 = 0.00582 GBP
        expect(result.rate).toBeCloseTo(0.78 / 134, 6)
        expect(result.via).toBe("live")
    })

    it("fetches both cell rates from the live API when none are provided", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                rates: { NPR: 134, GBP: 0.78, USD: 1 },
            }),
        } as any)
        const result = await getNprToCurrencyRate({ toCurrency: "GBP" })
        expect(result.rate).toBeCloseTo(0.78 / 134, 6)
        expect(result.via).toBe("live")
        expect(fetchMock).toHaveBeenCalled()
    })

    it("returns 0 when the target currency is unavailable from all sources", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ rates: { NPR: 134 } }),
        } as any)
        const result = await getNprToCurrencyRate({ toCurrency: "XYZ" })
        expect(result.rate).toBe(0)
        expect(result.via).toBe("fixed")
    })
})