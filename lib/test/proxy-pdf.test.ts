import { describe, expect, it } from "vitest"

// Replicate the proxy's validation logic for testing
const ALLOWED_DOMAINS = new Set([
  "www.nepalstock.com.np",
  "nepalstock.com.np",
  "merolagani.com",
  "www.merolagani.com",
  "shareholders.com.np",
  "www.shareholders.com.np",
])

const PRIVATE_IPS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
]

const isPrivateIp = (hostname: string): boolean => {
  if (PRIVATE_IPS.some((re) => re.test(hostname))) return true
  return hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")
}

const validateProxyUrl = (urlStr: string): { ok: false; error: string } | { ok: true; url: URL } => {
  try {
    const url = new URL(urlStr)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "Only http/https URLs are allowed" }
    }
    if (!ALLOWED_DOMAINS.has(url.hostname)) {
      return { ok: false, error: "Domain not allowed" }
    }
    if (isPrivateIp(url.hostname)) {
      return { ok: false, error: "Internal addresses are not allowed" }
    }
    return { ok: true, url }
  } catch {
    return { ok: false, error: "Invalid URL" }
  }
}

describe("proxy/pdf URL validation", () => {
  it("allows stock exchange domains", () => {
    expect(validateProxyUrl("https://www.nepalstock.com.np/report.pdf")).toEqual({ ok: true, url: expect.any(URL) })
    expect(validateProxyUrl("https://merolagani.com/data.pdf")).toEqual({ ok: true, url: expect.any(URL) })
    expect(validateProxyUrl("https://shareholders.com.np/doc.pdf")).toEqual({ ok: true, url: expect.any(URL) })
  })

  it("rejects arbitrary external domains", () => {
    expect(validateProxyUrl("https://evil.com/steal")).toEqual({ ok: false, error: "Domain not allowed" })
    expect(validateProxyUrl("https://google.com")).toEqual({ ok: false, error: "Domain not allowed" })
    expect(validateProxyUrl("https://attacker.net")).toEqual({ ok: false, error: "Domain not allowed" })
  })

  it("blocks private IP addresses (domain allowlist checked first)", () => {
    // Private IPs fail at domain check since they're not in allowlist
    expect(validateProxyUrl("http://127.0.0.1/admin")).toEqual({ ok: false, error: "Domain not allowed" })
    expect(validateProxyUrl("http://localhost:3000")).toEqual({ ok: false, error: "Domain not allowed" })
    expect(validateProxyUrl("http://10.0.0.1/config")).toEqual({ ok: false, error: "Domain not allowed" })
    expect(validateProxyUrl("http://192.168.1.1/admin")).toEqual({ ok: false, error: "Domain not allowed" })
    expect(validateProxyUrl("http://169.254.1.1/meta")).toEqual({ ok: false, error: "Domain not allowed" })
  })

  it("rejects non-http protocols", () => {
    expect(validateProxyUrl("ftp://files.com/data")).toEqual({ ok: false, error: "Only http/https URLs are allowed" })
    expect(validateProxyUrl("file:///etc/passwd")).toEqual({ ok: false, error: "Only http/https URLs are allowed" })
  })

  it("rejects invalid URL strings", () => {
    expect(validateProxyUrl("")).toEqual({ ok: false, error: "Invalid URL" })
    expect(validateProxyUrl("not-a-url")).toEqual({ ok: false, error: "Invalid URL" })
  })
})
