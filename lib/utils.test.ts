import { describe, expect, it } from "vitest"
import { formatTime, getCurrencySymbol, validateEmail } from "./utils"

describe("utils", () => {
  it("formats fractional hours as minutes", () => {
    expect(formatTime(0.5)).toBe("30 mins")
  })

  it("returns currency symbol from a standard currency code", () => {
    expect(getCurrencySymbol("USD")).toBe("$")
  })

  it("validates a proper email", () => {
    expect(validateEmail("demo@example.com")).toBe(true)
    expect(validateEmail("invalid-email")).toBe(false)
  })
})
