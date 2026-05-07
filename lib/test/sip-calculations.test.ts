import { describe, expect, it } from "vitest"
import { buildSipExecutionPlan, canSipCycleBuyUnit, getSipCycleAmounts, getSipTransactionGrossAmount, getSipTransactionNetAmount, isSipEnrollmentCandidate } from "../sip"

describe("sip calculations", () => {
  it("calculates cycle amounts with carried remainder", () => {
    const amounts = getSipCycleAmounts({
      installmentAmount: 2000,
      dpsCharge: 5,
      lastRemainder: 10,
    })

    expect(amounts.baseAmount).toBe(2000)
    expect(amounts.carryRemainder).toBe(10)
    expect(amounts.grossAmount).toBe(2010)
    expect(amounts.netAmount).toBe(2005)
  })

  it("can exclude carry remainder for base-only preview", () => {
    const amounts = getSipCycleAmounts(
      {
        installmentAmount: 2000,
        dpsCharge: 5,
        lastRemainder: 10,
      },
      { includeCarryRemainder: false },
    )

    expect(amounts.carryRemainder).toBe(0)
    expect(amounts.grossAmount).toBe(2000)
    expect(amounts.netAmount).toBe(1995)
  })

  it("builds a valid execution plan from shared math", () => {
    const execution = buildSipExecutionPlan(
      {
        installmentAmount: 2000,
        dpsCharge: 5,
        lastRemainder: 10,
      },
      250,
    )

    expect(execution.netAmount).toBe(2005)
    expect(execution.quantity).toBe(8)
    expect(execution.remainder).toBe(5)
  })

  it("derives transaction gross and net SIP amounts consistently", () => {
    const tx = {
      type: "buy" as const,
      price: 250,
      quantity: 8,
      sipDpsCharge: 5,
      sipGrossAmount: undefined,
      sipNetAmount: undefined,
    }

    expect(getSipTransactionGrossAmount(tx)).toBe(2005)
    expect(getSipTransactionNetAmount(tx)).toBe(2000)
  })

  it("identifies valid SIP enrollment candidates", () => {
    expect(isSipEnrollmentCandidate({ type: "buy", quantity: 1, sipPlanId: undefined })).toBe(true)
    expect(isSipEnrollmentCandidate({ type: "sell", quantity: 1, sipPlanId: undefined })).toBe(false)
    expect(isSipEnrollmentCandidate({ type: "buy", quantity: 0, sipPlanId: undefined })).toBe(false)
    expect(isSipEnrollmentCandidate({ type: "ipo", quantity: 2, sipPlanId: "sip-1" })).toBe(false)
    expect(canSipCycleBuyUnit({ installmentAmount: 2000, dpsCharge: 5, lastRemainder: 10 }, 250)).toBe(true)
  })
})
