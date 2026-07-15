export const normalizeCalculatorExpression = (value: string) =>
  value
    .replace(/[xX]/g, "*")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9+\-*/.()%]/g, "")

export const toEvaluableExpression = (value: string) =>
  normalizeCalculatorExpression(value).replace(/(\d+(?:\.\d+)?)%/g, "($1/100)")

export const formatCalculatorResult = (value: number) => {
  if (!Number.isFinite(value)) return "Error"
  const rounded = Number(value.toFixed(10))
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

export const safeEval = (expr: string): number => {
  const tokens = expr.match(/(\d+\.?\d*|[+\-*/().])/g) || []
  let pos = 0

  const peek = () => tokens[pos]
  const consume = () => tokens[pos++]

  const parseAddSub = (): number => {
    let left = parseMulDiv()
    while (peek() === "+" || peek() === "-") {
      const op = consume()
      const right = parseMulDiv()
      left = op === "+" ? left + right : left - right
    }
    return left
  }

  const parseMulDiv = (): number => {
    let left = parseUnary()
    while (peek() === "*" || peek() === "/") {
      const op = consume()
      const right = parseUnary()
      if (op === "/") {
        if (right === 0) throw new Error("Division by zero")
        left /= right
      } else {
        left *= right
      }
    }
    return left
  }

  const parseUnary = (): number => {
    if (peek() === "-") {
      consume()
      return -parseUnary()
    }
    return parsePrimary()
  }

  const parsePrimary = (): number => {
    if (peek() === "(") {
      consume()
      const val = parseAddSub()
      if (peek() !== ")") throw new Error("Missing closing paren")
      consume()
      return val
    }
    const num = parseFloat(consume())
    if (isNaN(num)) throw new Error("Invalid number")
    return num
  }

  const result = parseAddSub()
  if (pos !== tokens.length) throw new Error("Unexpected tokens")
  return result
}

export const getCalculatorPreview = (value: string) => {
  const normalized = normalizeCalculatorExpression(value)
  if (!normalized) return "0"
  if (/[+\-*/.]$/.test(normalized)) return "..."
  const result = calculateExpressionResult(normalized)
  return result === "Error" ? "..." : result
}

export const calculateExpressionResult = (value: string) => {
  const expression = toEvaluableExpression(value)
  if (!expression || /[+\-*/.]$/.test(expression) || !/^[0-9+\-*/.()%]+$/.test(expression)) {
    return "Error"
  }

  try {
    const result = safeEval(expression)
    return formatCalculatorResult(Number(result))
  } catch {
    return "Error"
  }
}
