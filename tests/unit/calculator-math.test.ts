import { describe, expect, it } from "vitest"
import {
  normalizeCalculatorExpression,
  toEvaluableExpression,
  formatCalculatorResult,
  safeEval,
  calculateExpressionResult,
} from "@/lib/calculator-math"

describe("normalizeCalculatorExpression", () => {
  it("replaces x/X with *", () => {
    expect(normalizeCalculatorExpression("2x3")).toBe("2*3")
    expect(normalizeCalculatorExpression("2X3")).toBe("2*3")
  })

  it("removes commas and spaces", () => {
    expect(normalizeCalculatorExpression("1, 234 + 5")).toBe("1234+5")
  })

  it("strips letters and other non-math characters", () => {
    expect(normalizeCalculatorExpression("1+alert(1)")).toBe("1+(1)")
    expect(normalizeCalculatorExpression("1+{}[]")).toBe("1+")
  })
})

describe("toEvaluableExpression", () => {
  it("converts percentages", () => {
    expect(toEvaluableExpression("200+10%")).toBe("200+(10/100)")
    expect(toEvaluableExpression("10%200")).toBe("(10/100)200")
  })
})

describe("formatCalculatorResult", () => {
  it("returns Error for non-finite values", () => {
    expect(formatCalculatorResult(Infinity)).toBe("Error")
    expect(formatCalculatorResult(NaN)).toBe("Error")
  })

  it("rounds to 10 decimal places", () => {
    expect(formatCalculatorResult(1 / 3)).toBe("0.3333333333")
  })

  it("converts negative zero to 0", () => {
    expect(formatCalculatorResult(-0)).toBe("0")
  })
})

describe("safeEval", () => {
  it("adds two numbers", () => {
    expect(safeEval("2+3")).toBe(5)
  })

  it("subtracts", () => {
    expect(safeEval("10-4")).toBe(6)
  })

  it("multiplies", () => {
    expect(safeEval("3*4")).toBe(12)
  })

  it("divides", () => {
    expect(safeEval("10/2")).toBe(5)
  })

  it("respects operator precedence", () => {
    expect(safeEval("2+3*4")).toBe(14)
    expect(safeEval("(2+3)*4")).toBe(20)
  })

  it("handles parentheses", () => {
    expect(safeEval("(1+2)*(3+4)")).toBe(21)
  })

  it("handles decimal numbers", () => {
    expect(safeEval("1.5+2.5")).toBe(4)
  })

  it("handles unary minus", () => {
    expect(safeEval("-5+3")).toBe(-2)
    expect(safeEval("-(3+2)")).toBe(-5)
  })

  it("throws on division by zero", () => {
    expect(() => safeEval("1/0")).toThrow()
  })

  it("throws on mismatched parentheses", () => {
    expect(() => safeEval("(1+2")).toThrow()
  })
})

describe("calculateExpressionResult", () => {
  it("returns correct result for valid expressions", () => {
    expect(calculateExpressionResult("2+2")).toBe("4")
    expect(calculateExpressionResult("10%")).toBe("0.1")
  })

  it("returns Error for invalid expressions", () => {
    expect(calculateExpressionResult("")).toBe("Error")
    expect(calculateExpressionResult("2+")).toBe("Error")
    expect(calculateExpressionResult("abc")).toBe("Error")
  })
})
