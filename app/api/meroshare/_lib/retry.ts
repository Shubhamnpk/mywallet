export async function withRetry<T>(fn: () => Promise<T>, options?: {
  maxRetries?: number
  baseDelayMs?: number
  label?: string
}): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2
  const baseDelayMs = options?.baseDelayMs ?? 1000
  const label = options?.label ?? "operation"

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        console.warn(`[retry] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, (error as Error)?.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
