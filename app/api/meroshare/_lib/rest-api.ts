/**
 * Direct REST provider for MeroShare.
 *
 * A TypeScript reimplementation of the `nepse_tools` Python library flow:
 *   1. GET /api/meroShare/capital/            -> resolve DP code to client id
 *   2. POST /api/meroShare/auth/              -> capture Authorization header
 *   3. GET  /api/meroShare/ownDetail/         -> demat / clientCode / name
 *   4. POST /api/meroShareView/myPortfolio/   -> portfolio rows
 *   5. POST /api/meroShareView/myTransaction/ -> transaction rows
 *   6. POST /api/meroShare/applicantForm/share/apply -> apply for IPO
 *   7. POST iporesult.cdsc.com.np/result/result/check -> allotment check
 *
 * Unlike the `api` (external backend) or `browser` (puppeteer) providers,
 * this talks to CDSC's backend directly with no extra infrastructure.
 */

import https from "https"
import { createHash } from "crypto"

const MEROSHARE_BASE = "https://webbackend.cdsc.com.np"
const IPO_RESULT_BASE = "https://iporesult.cdsc.com.np"

const DEFAULT_HEADERS: Record<string, string> = {
  "Connection": "keep-alive",
  "Origin": "https://meroshare.cdsc.com.np",
  "Referer": "https://meroshare.cdsc.com.np/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Content-Type": "application/json",
}

const IPO_RESULT_HEADERS: Record<string, string> = {
  ...DEFAULT_HEADERS,
  "Origin": "https://iporesult.cdsc.com.np",
  "Referer": "https://iporesult.cdsc.com.np/",
}

interface RestCredentials {
  dpId: string
  username: string
  password: string
  crn?: string
  pin?: string
}

interface ClientIdData {
  code: string
  id: number
  name: string
}

export interface RestPortfolioRow {
  symbol: string
  units: number
  currentPrice: number
  averageCost: number
  previousClose?: number
  lastUpdatedPrice?: number
  [key: string]: unknown
}

export interface RestTransactionRow {
  scrip: string
  transactionDate: string
  creditQuantity: number
  debitQuantity: number
  balanceAfterTransaction: number
  historyDescription: string
  [key: string]: unknown
}

interface OwnData {
  demat?: string
  boid?: string
  clientCode?: string
  name?: string
  username?: string
  [key: string]: unknown
}

interface AccountContext {
  demat: string
  boid: string
  clientCode: string
  ownClientCode: string
}

interface BankContext {
  bankCode: string
  accountNumber: string
  customerId: number
  accountBranchId: number
  applyBoid: string
  bankId: number
  crnNumber: string
}

interface IpoResultCompany {
  shareId?: number
  companyShareId?: number
  scrip?: string
  companyName?: string
  name?: string
  [key: string]: unknown
}

export class MeroShareRestError extends Error {
  statusCode?: number
  responseBody?: unknown

  constructor(message: string, opts?: { statusCode?: number; responseBody?: unknown }) {
    super(message)
    this.name = "MeroShareRestError"
    this.statusCode = opts?.statusCode
    this.responseBody = opts?.responseBody
  }
}

interface CachedSession {
  token: string
  ownData: OwnData | null
  expiresAt: number
  /** SHA-256 of dpId:username:password — proves the requester knows the password, not just the username. */
  credHash: string
}

/**
 * Server-side session cache: reuses the MeroShare Authorization token (and own
 * detail) across requests from the same account for 3 minutes. Every use slides
 * the expiry forward, so any action inside the window keeps the session alive.
 * Sessions live in-process only and are dropped on the first 401/403.
 */
const SESSION_TTL_MS = 3 * 60 * 1000
const sessionCache = new Map<string, CachedSession>()

/**
 * Per-username login mutex: concurrent flows (portfolio sync + IPO center +
 * application report) all need an authenticated session, but CDSC throttles
 * repeated logins hard. The first caller logs in; everyone else waits on the
 * same promise and then picks the token up from the session cache.
 */
const loginLocks = new Map<string, Promise<void>>()

/** Hard ceiling for a single upstream HTTP call so hung CDSC connections fail fast instead of stalling routes. */
const REQUEST_TIMEOUT_MS = 45_000

/**
 * Fingerprint the submitted credentials. Cached sessions can only be restored
 * when this hash matches, so knowing a victim's username + DP code alone is
 * not enough to reuse their live MeroShare token.
 */
function credentialHash(credentials: RestCredentials): string {
  return createHash("sha256")
    .update(`${(credentials.dpId || "").trim()}:${(credentials.username || "").trim()}:${credentials.password ?? ""}`)
    .digest("hex")
}

/** Drop the cached MeroShare session for a username (e.g. after a 401/403). */
export function clearCachedSession(username: string): void {
  sessionCache.delete((username || "").trim())
}

export interface MeroShareFailure {
  status: number
  message: string
}

/**
 * Translate an upstream MeroShare failure into an honest HTTP status and a
 * user-actionable message, instead of every route returning a blanket 500.
 */
export function describeMeroShareFailure(error: unknown, fallbackMessage = "MeroShare request failed"): MeroShareFailure {
  const raw = String((error as any)?.message ?? "")
  const status = Number((error as any)?.statusCode ?? 0)
  if (/login failed|invalid credential|incorrect|wrong password/i.test(raw)) {
    return { status: 401, message: "MeroShare rejected these credentials. Check DP/username/password in Settings." }
  }
  if (status === 429 || /rate.?limit|throttl|too many/i.test(raw)) {
    return { status: 429, message: "MeroShare is rate-limiting requests right now. Wait a few seconds and try again." }
  }
  if (status === 401 || status === 403) {
    return { status: 401, message: "Your MeroShare session expired mid-request. Please retry." }
  }
  if (/timeout|timed out|aborted/i.test(raw)) {
    return { status: 504, message: "MeroShare took too long to respond. Please try again shortly." }
  }
  if (status >= 500 || status === 0 || /network error/i.test(raw)) {
    return { status: 502, message: "MeroShare is temporarily unavailable. Please try again in a moment." }
  }
  return { status: 500, message: raw || fallbackMessage }
}

/**
 * Run a flow with automatic recovery when the cached session dies mid-run:
 * clears the cached token and retries once with a fresh client/login.
 */
export async function runWithSessionRecovery<T>(
  username: string,
  run: (client: MeroShareRestClient) => Promise<T>,
): Promise<T> {
  let client = new MeroShareRestClient()
  try {
    return await run(client)
  } catch (error: any) {
    const status = Number(error?.statusCode ?? 0)
    const unauthorized = status === 401 || status === 403 || /unauthorized/i.test(String(error?.message ?? ""))
    if (unauthorized && !/login failed/i.test(String(error?.message ?? ""))) {
      clearCachedSession(username)
      client = new MeroShareRestClient()
      return await run(client)
    }
    throw error
  }
}

export class MeroShareRestClient {
  private authToken: string | null = null
  private ownData: OwnData | null = null
  private context: AccountContext | null = null
  private bankContext: BankContext | null = null
  private dpCode = ""
  private username = ""
  private lastApplicableRaw = ""
  private lastCurrentIssuesRaw = ""
  private lastIpoResultRaw = ""

  private headers(): Record<string, string> {
    return {
      ...DEFAULT_HEADERS,
      ...(this.authToken ? { Authorization: this.authToken } : {}),
    }
  }

  get hasSession(): boolean {
    return Boolean(this.authToken)
  }

  /**
   * Reuse a cached authenticated session for the username if still fresh
   * (sliding 3-minute TTL) AND the submitted credentials match the ones the
   * session was originally created with. Prevents username-only session theft.
   */
  restoreSession(credentials: RestCredentials): boolean {
    const key = (credentials.username || "").trim()
    if (!key) return false
    const cached = sessionCache.get(key)
    if (!cached) return false
    if (Date.now() >= cached.expiresAt) {
      sessionCache.delete(key)
      return false
    }
    if (cached.credHash !== credentialHash(credentials)) {
      // Credentials don't match the live session — do NOT leak it. Force a fresh login.
      return false
    }
    this.authToken = cached.token
    this.username = key
    this.dpCode = (credentials.dpId || "").trim()
    if (cached.ownData) this.ownData = cached.ownData
    cached.expiresAt = Date.now() + SESSION_TTL_MS
    return true
  }

  /** Login unless a fresh cached session already exists for these exact credentials. Concurrent callers share one login. */
  async ensureSession(credentials: RestCredentials): Promise<void> {
    const key = (credentials.username || "").trim()
    if (this.restoreSession(credentials)) return

    const inFlight = loginLocks.get(key)
    if (inFlight) {
      try {
        await inFlight
      } catch {
        // The shared login failed; fall through and try our own so the error surfaces from this call.
      }
      if (this.restoreSession(credentials)) return
    }

    const loginPromise: Promise<void> = this.login(credentials).then(
      () => undefined,
    ).finally(() => {
      if (loginLocks.get(key) === loginPromise) loginLocks.delete(key)
    })
    loginLocks.set(key, loginPromise)
    await loginPromise
  }

  private async request(
    method: string,
    url: string,
    body?: unknown,
    headers: Record<string, string> = this.headers(),
    signal?: AbortSignal,
  ): Promise<Response> {
    let lastErr: unknown
    const timeoutSignal = signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: timeoutSignal,
          cache: "no-store",
        })
      } catch (err: any) {
        if (err?.name === "AbortError") throw err
        lastErr = err
        if (err?.name === "TimeoutError") break
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)))
      }
    }
    const timedOut = lastErr instanceof Error && (lastErr.name === "TimeoutError" || /timeout/i.test(lastErr.message))
    throw new MeroShareRestError(
      timedOut
        ? `MeroShare API request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s`
        : `Network error contacting MeroShare API: ${lastErr instanceof Error ? lastErr.message : "unknown error"}`,
    )
  }

  /**
   * Retry a call on transient non-2xx failures with exponential backoff plus jitter.
   * CDSC throttles bursts (429/500/502/503), so tight fixed delays fail together -
   * spreading attempts out and randomising them lets one caller slip through.
   */
  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await fn()
      } catch (err: any) {
        const status = Number(err?.statusCode ?? err?.status ?? 0)
        const retriable = err?.name === "AbortError"
          ? false
          : status === 0 || status === 500 || status === 502 || status === 503 || status === 429 || status >= 500
        if (!retriable) throw err
        lastErr = err
        if (attempt < attempts - 1) {
          const backoff = Math.min(400 * Math.pow(2, attempt), 3200)
          const jitter = Math.round(Math.random() * backoff * 0.5)
          await new Promise((resolve) => setTimeout(resolve, backoff + jitter))
        }
      }
    }
    throw lastErr
  }

  /**
   * Raw https request that sends ALL headers verbatim (fetch/undici silently
   * strips forbidden headers like Origin/Referer, which the iporesult WAF requires).
   */
  private async requestRaw(
    method: string,
    url: string,
    body?: unknown,
    headers: Record<string, string> = this.headers(),
  ): Promise<{ status: number; text: string }> {
    const target = new URL(url)
    const payload = body !== undefined ? JSON.stringify(body) : undefined
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: target.hostname,
          path: target.pathname + target.search,
          method,
          headers: {
            ...headers,
            ...(payload !== undefined ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          },
        },
        (res) => {
          let text = ""
          res.setEncoding("utf8")
          res.on("data", (chunk) => (text += chunk))
          res.on("end", () => resolve({ status: res.statusCode ?? 0, text }))
        },
      )
      req.on("error", (err) =>
        reject(new MeroShareRestError(`Network error contacting MeroShare API: ${err.message ?? "unknown error"}`)),
      )
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy(new MeroShareRestError(`MeroShare API request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s`))
      })
      if (payload !== undefined) req.write(payload)
      req.end()
    })
  }

  private async requestRawJson(
    method: string,
    url: string,
    body?: unknown,
    headers: Record<string, string> = this.headers(),
  ): Promise<unknown> {
    const { status, text } = await this.requestRaw(method, url, body, headers)
    if (status < 200 || status >= 300) {
      throw new MeroShareRestError(
        `MeroShare ${url} failed (${status}): ${text.slice(0, 300)}`,
        { statusCode: status, responseBody: text },
      )
    }
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  private async assertOk(response: Response, context: string): Promise<unknown> {
    if (!response.ok) {
      let detail = ""
      try {
        const json = await response.json()
        detail = JSON.stringify(json).slice(0, 300)
      } catch {
        detail = await response.text().catch(() => "")
      }
      throw new MeroShareRestError(
        `MeroShare ${context} failed (${response.status}): ${detail}`,
        { statusCode: response.status, responseBody: detail },
      )
    }
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  /** Resolve the DP entry (code + client id) from CDSC's DP list, matching both code and local id. */
  private async resolveDpEntry(dp: string): Promise<ClientIdData> {
    const resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/capital/`)
    const data = (await this.assertOk(resp, "DP list")) as ClientIdData[]
    const match = Array.isArray(data)
      ? data.find((item) => item?.code === dp || String(item?.id) === dp)
      : null
    if (!match) {
      throw new MeroShareRestError(`DP '${dp}' not found in MeroShare DP list.`)
    }
    return match
  }

  /** Resolve the numeric client id for the given DP (matches both code and id). */
  async getClientId(dp: string): Promise<number> {
    return (await this.resolveDpEntry(dp)).id
  }

  /** Login and capture the Authorization token from the response headers. */
  async login(credentials: RestCredentials): Promise<{ token: string; raw: unknown }> {
    return this.withRetry(async () => {
      const dpEntry = await this.resolveDpEntry(credentials.dpId)
      this.dpCode = dpEntry.code || (credentials.dpId || "").trim()
      this.username = (credentials.username || "").trim()
      const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShare/auth/`, {
        clientId: dpEntry.id,
        username: credentials.username,
        password: credentials.password,
      })
      if (!resp.ok) {
        await this.assertOk(resp, "login")
      }
      const token = resp.headers.get("Authorization")
      if (!token) {
        throw new MeroShareRestError("Login succeeded but no Authorization token was returned by MeroShare.")
      }
      this.authToken = token
      sessionCache.set(this.username, {
        token,
        ownData: null,
        expiresAt: Date.now() + SESSION_TTL_MS,
        credHash: credentialHash(credentials),
      })
      return { token, raw: await resp.json().catch(() => null) }
    })
  }

  /** Load the logged-in user's own data (demat, clientCode, name). */
  async getOwnData(): Promise<OwnData> {
    if (this.ownData) return this.ownData
    this.ownData = await this.withRetry(async () => {
      const resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/ownDetail/`)
      const data = (await this.assertOk(resp, "own detail")) as OwnData
      const cached = sessionCache.get(this.username)
      if (cached) cached.ownData = data || null
      return data || {}
    })
    return this.ownData
  }

  /**
   * Fetch the full account health payload: own detail (demat/password expiry,
   * suspension flag, contact) plus bank details (bank name, account number,
   * branch, CRN). Mirrors the reference `ownDetail` + `myDetail` + `bankRequest`
   * flow. Each section degrades gracefully if its endpoint fails.
   */
  async getAccountHealth(): Promise<Record<string, unknown>> {
    const own = await this.getOwnData()
    const ctx = await this.ensureAccountContext()

    let myDetail: Record<string, unknown> | null = null
    try {
      myDetail = (await this.assertOk(
        await this.request("GET", `${MEROSHARE_BASE}/api/meroShareView/myDetail/${ctx.demat}`),
        "my bank detail",
      )) as Record<string, unknown> | null
    } catch {
      myDetail = null
    }

    const bankCode = String(myDetail?.bankCode ?? "").trim()
    let bankRequest: Record<string, unknown> | null = null
    if (bankCode) {
      try {
        bankRequest = (await this.assertOk(
          await this.request("GET", `${MEROSHARE_BASE}/api/bankRequest/${bankCode}`),
          "bank request",
        )) as Record<string, unknown> | null
      } catch {
        bankRequest = null
      }
    }

    return {
      own: own ?? {},
      myDetail: myDetail ?? {},
      bank: bankRequest ?? {},
    }
  }

  /**
   * Account identifiers, computed without any extra API calls:
   *   demat = DP code + zero-padded 8-digit username (16100 + 00612541 -> 1610000612541)
   *   BOID  = 130 + demat (1301610000612541)
   * ownDetail is only used for the name and the clientCode candidates.
   */
  private async ensureAccountContext(): Promise<AccountContext> {
    if (this.context) return this.context

    const own = await this.getOwnData()
    const paddedUsername = this.username.padStart(8, "0")
    const demat = typeof own.demat === "string" && own.demat.trim()
      ? own.demat.trim()
      : `${this.dpCode}${paddedUsername}`
    if (!demat) {
      throw new MeroShareRestError("MeroShare own detail is missing the demat number.")
    }

    this.context = {
      demat,
      boid: String(own.boid ?? "").trim() || `130${demat}`,
      clientCode: this.dpCode,
      ownClientCode: String(own.clientCode ?? "").trim(),
    }
    return this.context
  }

  /** Identifier combos for myTransaction/myPortfolio (boid/demat × clientCode) - CDSC accepts only certain pairs. */
  private async identifierCandidates() {
    const ctx = await this.ensureAccountContext()
    const combos = [
      [ctx.demat, ctx.ownClientCode],
      [ctx.boid, ctx.ownClientCode],
      [ctx.demat, ctx.clientCode],
      [ctx.boid, ctx.clientCode],
    ]
    const seen = new Set<string>()
    const out: { demat: string; clientCode: string }[] = []
    for (const [demat, clientCode] of combos) {
      const key = `${demat}|${clientCode}`
      if (!demat || !clientCode || seen.has(key)) continue
      seen.add(key)
      out.push({ demat, clientCode })
    }
    return out
  }

  /** Bank context (myDetail + bankRequest) - only needed for IPO applications, loaded lazily. */
  private async ensureBankContext(): Promise<BankContext> {
    if (this.bankContext) return this.bankContext

    const ctx = await this.ensureAccountContext()
    const myDetail = (await this.assertOk(
      await this.request("GET", `${MEROSHARE_BASE}/api/meroShareView/myDetail/${ctx.demat}`),
      "my bank detail",
    )) as Record<string, unknown> | null

    const bankCode = String(myDetail?.bankCode ?? "").trim()
    const bankRequest = bankCode
      ? ((await this.assertOk(
          await this.request("GET", `${MEROSHARE_BASE}/api/bankRequest/${bankCode}`),
          "bank request",
        )) as Record<string, unknown> | null)
      : null

    const nested = (key: string) =>
      (bankRequest?.[key] as Record<string, unknown> | undefined) ?? {}

    this.bankContext = {
      bankCode,
      accountNumber: String(myDetail?.accountNumber ?? ""),
      customerId: Number(bankRequest?.id ?? 0),
      accountBranchId: Number(nested("branch").id ?? 0),
      applyBoid: String(bankRequest?.boid ?? "") || ctx.boid,
      bankId: Number(nested("bank").id ?? 0),
      crnNumber: String(bankRequest?.crnNumber ?? ""),
    }
    return this.bankContext
  }

  /** Fetch the full portfolio holdings. */
  async getPortfolio(): Promise<RestPortfolioRow[]> {
    const candidates = await this.identifierCandidates()
    let anyOk = false
    let lastError: Error | null = null
    for (const { demat, clientCode } of candidates) {
      try {
        const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShareView/myPortfolio/`, {
          sortBy: "script",
          demat: [demat],
          clientCode,
          page: 1,
          size: 200,
          sortAsc: true,
        })
        const data = (await this.assertOk(resp, "portfolio")) as { object?: unknown[] } | unknown[]
        const rows = Array.isArray(data) ? data : (data as { object?: unknown[] })?.object ?? []
        const mapped = (Array.isArray(rows) ? rows : [])
          .map((raw) => this.mapPortfolioRow(raw as Record<string, unknown>))
          .filter((row) => row.symbol)
        anyOk = true
        if (mapped.length > 0) {
          return mapped
        }
      } catch (err: any) {
        lastError = err
      }
    }
    if (!anyOk && lastError) throw lastError
    return []
  }

  private mapPortfolioRow(raw: Record<string, unknown>): RestPortfolioRow {
    const num = (keys: string[]) => {
      for (const key of keys) {
        const value = raw[key]
        if (value === undefined || value === null) continue
        const parsed = Number(String(value).replace(/,/g, "").trim())
        if (Number.isFinite(parsed)) return parsed
      }
      return 0
    }

    const symbol = String(
      raw.symbol ?? raw.script ?? raw.scrip ?? raw.stockSymbol ?? raw.shareSymbol ?? raw["stockSymbol"] ?? "",
    ).trim().toUpperCase()

    return {
      symbol,
      units: num(["currentBalance", "balanceQty", "qty", "quantity", "units", "netQuantity"]),
      currentPrice: num(["ltp", "lastTransactionPrice", "currentPrice", "lastTradedPrice", "closePrice"]),
      averageCost: num(["averageCost", "avgCost", "averagePrice", "costPrice"]),
      previousClose: num(["previousClose", "preClose", "prevClose"]) || undefined,
      lastUpdatedPrice: num(["lastUpdatedPrice", "lastUpdatedLTP"]) || undefined,
      ...raw,
    }
  }

  /** Fetch share transaction history, optionally filtered by symbol. */
  async getTransactions(symbol?: string): Promise<RestTransactionRow[]> {
    const candidates = await this.identifierCandidates()
    let anyOk = false
    let lastError: Error | null = null
    for (const { demat, clientCode } of candidates) {
      try {
        const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShareView/myTransaction/`, {
          boid: demat,
          clientCode,
          script: symbol || null,
          fromDate: null,
          toDate: null,
          requestTypeScript: Boolean(symbol),
          page: 1,
          size: 200,
        })
        const data = (await this.assertOk(resp, "transaction history")) as Record<string, unknown>
        const rows = Array.isArray(data)
          ? data
          : (data as Record<string, unknown>).transactionView
            ?? (data as Record<string, unknown>).object
            ?? []
        const mapped = (Array.isArray(rows) ? rows : [])
          .map((raw) => this.mapTransactionRow(raw as Record<string, unknown>))
          .filter((row) => row.scrip && row.transactionDate)
        anyOk = true
        if (mapped.length > 0) {
          return mapped
        }
      } catch (err: any) {
        lastError = err
      }
    }
    if (!anyOk && lastError) throw lastError
    return []
  }

  private mapTransactionRow(raw: Record<string, unknown>): RestTransactionRow {
    const num = (keys: string[]) => {
      for (const key of keys) {
        const value = raw[key]
        if (value === undefined || value === null) continue
        const parsed = Number(String(value).replace(/,/g, "").trim())
        if (Number.isFinite(parsed)) return parsed
      }
      return 0
    }
    const str = (keys: string[]) => {
      for (const key of keys) {
        const value = raw[key]
        if (typeof value === "string" && value.trim()) return value.trim()
        if (value !== undefined && value !== null) return String(value).trim()
      }
      return ""
    }

    return {
      scrip: str(["script", "scrip", "symbol", "stockSymbol", "shareSymbol"]).toUpperCase(),
      transactionDate: str(["transactionDate", "txnDate", "tranDate", "date"]),
      creditQuantity: num(["creditQuantity", "creditQty", "buyQty", "qtyCredit"]),
      debitQuantity: num(["debitQuantity", "debitQty", "sellQty", "qtyDebit"]),
      balanceAfterTransaction: num(["balanceAfterTransaction", "balanceQty", "balance", "closingBalance", "balAfterTrans"]),
      historyDescription: str(["historyDescription", "historyDesc", "description", "remarks", "narrative", "transactionDescription"]),
      ...raw,
    }
  }

  /** Fetch IPOs currently applicable to the logged-in account. */
  async getApplicableShares(): Promise<unknown[]> {
    const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShare/companyShare/applicableIssue/`, {
      filterFieldParams: [
        { key: "companyIssue.companyISIN.script", alias: "Scrip" },
        { key: "companyIssue.companyISIN.company.name", alias: "Company Name" },
        { key: "companyIssue.assignedToClient.name", value: "", alias: "Issue Manager" },
      ],
      page: 1,
      size: 50,
      searchRoleViewConstants: "VIEW_APPLICABLE_SHARE",
      filterDateParams: [
        { key: "minIssueOpenDate", condition: "", alias: "", value: "" },
        { key: "maxIssueCloseDate", condition: "", alias: "", value: "" },
      ],
    })
    const data = (await this.assertOk(resp, "applicable shares")) as unknown
    if (typeof data === "string") {
      const snippet = data.slice(0, 200)
      throw new MeroShareRestError(`Applicable shares returned a non-JSON response: ${snippet}`)
    }
    const rows = Array.isArray(data)
      ? data
      : (data as { object?: unknown[] })?.object
        ?? (data as { data?: unknown[] })?.data
        ?? []
    this.lastApplicableRaw = JSON.stringify(data).slice(0, 600)
    return Array.isArray(rows) ? rows : []
  }

  /** Fetch all currently open issues (the MeroShare app's "Current Issue" list). */
  async getCurrentIssues(): Promise<unknown[]> {
    const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShare/companyShare/currentIssue`, {
      filterFieldParams: [
        { key: "companyIssue.companyISIN.script", alias: "Scrip" },
        { key: "companyIssue.companyISIN.company.name", alias: "Company Name" },
        { key: "companyIssue.assignedToClient.name", value: "", alias: "Issue Manager" },
      ],
      page: 1,
      size: 200,
      searchRoleViewConstants: "VIEW_OPEN_SHARE",
      filterDateParams: [
        { key: "minIssueOpenDate", condition: "", alias: "", value: "" },
        { key: "maxIssueCloseDate", condition: "", alias: "", value: "" },
      ],
    })
    const data = (await this.assertOk(resp, "current issues")) as unknown
    if (typeof data === "string") {
      const snippet = data.slice(0, 200)
      throw new MeroShareRestError(`Current issues returned a non-JSON response: ${snippet}`)
    }
    const rows = Array.isArray(data)
      ? data
      : (data as { object?: unknown[] })?.object
        ?? (data as { data?: unknown[] })?.data
        ?? []
    this.lastCurrentIssuesRaw = JSON.stringify(data).slice(0, 600)
    return Array.isArray(rows) ? rows : []
  }

  /** Check whether the account is eligible to apply for the given IPO. */
  async canApplyToIpo(companyShareId: number | string): Promise<boolean> {
    const ctx = await this.ensureAccountContext()
    const resp = await this.request(
      "GET",
      `${MEROSHARE_BASE}/api/meroShare/applicantForm/customerType/${companyShareId}/${ctx.demat}`,
    )
    if (!resp.ok) {
      return false
    }
    const data = (await resp.json().catch(() => null)) as { message?: string } | null
    return data?.message === "Customer can apply."
  }

  /** Apply for an IPO with the standard payload (mirrors the reference Python flow). */
  async applyForIpo(
    credentials: RestCredentials,
    opts: { companyShareId: number | string; number_of_shares: number },
  ): Promise<unknown> {
    const payload = await this.buildApplyPayload(credentials, opts)
    const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShare/applicantForm/share/apply`, payload)
    return this.assertOk(resp, "IPO application")
  }

  private async buildApplyPayload(
    credentials: RestCredentials,
    opts: { companyShareId: number | string; number_of_shares: number },
  ): Promise<Record<string, unknown>> {
    const ctx = await this.ensureAccountContext()
    const bank = await this.ensureBankContext().catch(() => null)
    const pin = credentials.pin
    if (!pin) {
      throw new MeroShareRestError("Transaction PIN is required to apply for an IPO.")
    }

    // Mirrors the exact reference payload:
    //   boid = bankRequest.boid (applyBoid), demat = ownDetail.demat,
    //   accountBranchId = bankRequest.branch.id, customerId = bankRequest.id,
    //   bankId = bankRequest.bank.id, accountNumber = myDetail.accountNumber.
    return {
      accountBranchId: bank?.accountBranchId || null,
      accountNumber: bank?.accountNumber || null,
      appliedKitta: String(opts.number_of_shares),
      bankId: bank?.bankId || null,
      boid: bank?.applyBoid || ctx.boid,
      companyShareId: String(opts.companyShareId),
      crnNumber: credentials.crn || bank?.crnNumber || null,
      customerId: bank?.customerId || null,
      demat: ctx.demat,
      transactionPIN: pin,
    }
  }

  /** List companies that have uploaded IPO results on the iporesult host. */
  async getIpoResultCompanyList(): Promise<IpoResultCompany[]> {
    const data = await this.requestRawJson("GET", `${IPO_RESULT_BASE}/result/companyShares/fileUploaded`, undefined, IPO_RESULT_HEADERS)
    if (typeof data === "string") {
      const snippet = data.slice(0, 200)
      throw new MeroShareRestError(
        `IPO result company list returned a non-JSON response (possible WAF block): ${snippet}`,
      )
    }
    const rows = Array.isArray(data)
      ? data
      : (data as { object?: unknown[] })?.object
        ?? (data as { companyShareList?: unknown[] })?.companyShareList
        ?? (data as { data?: unknown[] })?.data
        ?? []
    this.lastIpoResultRaw = JSON.stringify(data).slice(0, 600)
    const mapped = (Array.isArray(rows) ? rows : []).map((row) => {
      const entry = row as IpoResultCompany
      if (entry.shareId === undefined && entry.companyShareId === undefined) {
        const id = (row as { id?: unknown })?.id
        if (id !== undefined && id !== null) return { ...entry, shareId: Number(id) }
      }
      return entry
    })
    return mapped as IpoResultCompany[]
  }

  /** Fetch the logged-in user's ASBA application report (My ASBA -> Application Report). */
  async getApplicationReports(): Promise<Record<string, unknown>[]> {
    return this.withRetry(async () => {
      const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShare/applicantForm/active/search/`, {
        filterFieldParams: [
          { key: "companyShare.companyIssue.companyISIN.script", alias: "Scrip" },
          { key: "companyShare.companyIssue.companyISIN.company.name", alias: "Company Name" },
        ],
        page: 1,
        size: 200,
        searchRoleViewConstants: "VIEW_APPLICANT_FORM_COMPLETE",
        filterDateParams: [
          { key: "appliedDate", condition: "", alias: "", value: "" },
          { key: "appliedDate", condition: "", alias: "", value: "" },
        ],
      })
      const data = (await this.assertOk(resp, "application report")) as unknown
      if (typeof data === "string") {
        throw new MeroShareRestError(`Application report returned a non-JSON response: ${data.slice(0, 200)}`)
      }
      const rows = Array.isArray(data)
        ? data
        : (data as { object?: unknown[] })?.object
          ?? (data as { data?: unknown[] })?.data
          ?? []
      return (Array.isArray(rows) ? rows : []) as Record<string, unknown>[]
    })
  }

  /** Fetch the full detail of a single ASBA application (applied/allotted kitta, dates, remarks). */
  async getApplicationDetail(applicantFormId: number | string): Promise<Record<string, unknown>> {
    return this.withRetry(async () => {
      const id = String(applicantFormId)
      let resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/applicantForm/report/detail/${id}`)
      if (!resp.ok) {
        resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/migrated/applicantForm/report/${id}`)
      }
      const data = (await this.assertOk(resp, "application detail")) as unknown
      if (typeof data === "string") {
        throw new MeroShareRestError(`Application detail returned a non-JSON response: ${data.slice(0, 200)}`)
      }
      return (data ?? {}) as Record<string, unknown>
    })
  }

  /** Check allotment via the user's own ASBA application report (like the MeroShare app). */
  async checkAllotmentViaApplicationReport(
    identifier: string | number,
  ): Promise<{ matched: boolean; statusName?: string; isAllotted: boolean; allottedQuantity: number; row?: Record<string, unknown> }> {
    const needleRaw = String(identifier).trim()
    const needleCode = needleRaw.toUpperCase()
    const needle = this.normalizeCompanyName(needleRaw)
    const reports = await this.getApplicationReports()
    const match = reports
      .map((row) => {
        const fields = [
          row.scrip,
          row.companyName,
          row.name,
          row["companyIssue"],
          row["company"],
        ].filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        if (fields.some((field) => field.trim().toUpperCase() === needleCode)) return { row, score: 1 }
        const score = Math.max(0, ...fields.map((field) => this.companyMatchScore(needle, this.normalizeCompanyName(field))))
        return score > 0 ? { row, score } : null
      })
      .filter((m): m is { row: Record<string, unknown>; score: number } => m !== null)
      .sort((a, b) => b.score - a.score)[0]

    if (!match) {
      return { matched: false, isAllotted: false, allottedQuantity: 0 }
    }
    const row = match.row
    const formId = Number(row.applicantFormId ?? 0)
    let detail: Record<string, unknown> | null = null
    if (formId > 0) {
      try {
        detail = await this.getApplicationDetail(formId)
      } catch {
        detail = null
      }
    }
    const statusName = String(detail?.statusName ?? row.statusName ?? row["status"] ?? "").trim()
    const stageName = String(detail?.stageName ?? "").trim()
    const allotted = Number(detail?.receivedKitta ?? row.receivedKitta ?? row["allottedQuantity"] ?? row["allottedKitta"] ?? 0)
    const isAllotted = Boolean(
      Number.isFinite(allotted) && allotted > 0 || /allot/i.test(stageName) && /result/i.test(stageName),
    )
    return {
      matched: true,
      statusName,
      isAllotted,
      allottedQuantity: Number.isFinite(allotted) ? allotted : 0,
      row: { ...row, ...(detail ?? {}) },
    }
  }

  /** Check IPO allotment for the given company share id and 16-digit BOID. */
  async checkAllotment(companyShareId: number | string, boid?: string): Promise<unknown> {
    const ctx = await this.ensureAccountContext()
    const looksLikeBoid = (value: string) => /^130\d{13}$/.test(value)
    const boidValue = boid ?? (looksLikeBoid(ctx.boid) ? ctx.boid : looksLikeBoid(ctx.demat) ? ctx.demat : ctx.boid)
    const data = await this.requestRawJson(
      "POST",
      `${IPO_RESULT_BASE}/result/result/check`,
      { companyShareId: Number(companyShareId), boid: boidValue },
      IPO_RESULT_HEADERS,
    )
    return data
  }

  /** Resolve an IPO company share id from a scrip/name via the applicable list, then the results list. */
  async resolveCompanyShareId(identifier: string | number): Promise<number> {
    if (typeof identifier === "number") return identifier
    const numeric = Number(identifier)
    if (Number.isFinite(numeric) && numeric > 0) return numeric

    const needleRaw = String(identifier).trim()
    const needleCode = needleRaw.toUpperCase()
    const needle = this.normalizeCompanyName(needleRaw)

    const scoreCandidate = (
      candidate: Record<string, unknown>,
      idKeys: string[],
    ): { id: number; score: number } | null => {
      const fields = [
        candidate.scrip,
        candidate.companyName,
        candidate.name,
        candidate.companyIssue,
        candidate["company"],
      ].filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      if (fields.some((field) => field.trim().toUpperCase() === needleCode)) {
        const id = Number(idKeys.map((key) => candidate[key]).find((v) => v !== undefined && v !== null))
        if (Number.isFinite(id) && id > 0) return { id, score: 1 }
      }
      const score = Math.max(0, ...fields.map((field) => this.companyMatchScore(needle, this.normalizeCompanyName(field))))
      if (score === 0) return null
      const id = Number(idKeys.map((key) => candidate[key]).find((v) => v !== undefined && v !== null))
      return Number.isFinite(id) && id > 0 ? { id, score } : null
    }

    // Open IPOs are only present in the applicable-shares list (e.g. for applying).
    let applicable: unknown[] = []
    let applicableError: string | null = null
    try {
      applicable = await this.getApplicableShares()
    } catch (err: any) {
      applicableError = err?.message ?? String(err)
    }
    const applicableMatches = (applicable as Record<string, unknown>[])
      .map((share) => scoreCandidate(share, ["companyShareId", "shareId"]))
      .filter((match): match is { id: number; score: number } => match !== null)
      .sort((a, b) => b.score - a.score)
    if (applicableMatches.length > 0) return applicableMatches[0].id

    // All currently open issues (the app's "Current Issue" list) - covers open IPOs.
    let current: unknown[] = []
    let currentError: string | null = null
    try {
      current = await this.getCurrentIssues()
    } catch (err: any) {
      currentError = err?.message ?? String(err)
    }
    const currentMatches = (current as Record<string, unknown>[])
      .map((share) => scoreCandidate(share, ["companyShareId", "shareId"]))
      .filter((match): match is { id: number; score: number } => match !== null)
      .sort((a, b) => b.score - a.score)
    if (currentMatches.length > 0) return currentMatches[0].id

    // The user's own ASBA applications (My ASBA -> Application Report).
    let reports: Record<string, unknown>[] = []
    let reportsError: string | null = null
    try {
      reports = await this.getApplicationReports()
    } catch (err: any) {
      reportsError = err?.message ?? String(err)
    }
    const reportMatches = reports
      .map((share) => scoreCandidate(share, ["companyShareId", "shareId"]))
      .filter((match): match is { id: number; score: number } => match !== null)
      .sort((a, b) => b.score - a.score)
    if (reportMatches.length > 0) return reportMatches[0].id

    // Closed IPOs / result checks are in the uploaded-results list.
    const companies = await this.getIpoResultCompanyList()
    const resultMatches = companies
      .map((company) => scoreCandidate(company, ["shareId", "companyShareId"]))
      .filter((match): match is { id: number; score: number } => match !== null)
      .sort((a, b) => b.score - a.score)
    if (resultMatches.length > 0) return resultMatches[0].id

    const suggestions = [...(applicable as Record<string, unknown>[]), ...(companies as Record<string, unknown>[])]
      .map((entry) => String(entry.companyName ?? entry.name ?? entry.scrip ?? "").trim())
      .filter(Boolean)
      .slice(0, 3)
    const summary = (rows: Record<string, unknown>[]) =>
      rows.length === 0
        ? "empty"
        : rows
            .map((entry) => String(entry.companyName ?? entry.name ?? entry.scrip ?? "").trim())
            .filter(Boolean)
            .slice(0, 3)
            .join(" | ") || "(rows without names)"
    throw new MeroShareRestError(
      `Could not resolve '${identifier}' to a MeroShare IPO company. ` +
        `Applicable: ${summary(applicable as Record<string, unknown>[])} | Current: ${summary(current as Record<string, unknown>[])} | Report: ${summary(reports)} | Results: ${summary(companies as Record<string, unknown>[])}` +
        (applicableError ? ` | Applicable fetch error: ${applicableError.slice(0, 200)}` : "") +
        (currentError ? ` | Current fetch error: ${currentError.slice(0, 200)}` : "") +
        (reportsError ? ` | Report fetch error: ${reportsError.slice(0, 200)}` : ""),
    )
  }

  /** Normalize a company name for fuzzy matching (mirrors the frontend's normalizeIpoName). */
  private normalizeCompanyName(value: string): string {
    return String(value)
      .toLowerCase()
      .replace(/\b(limited|ltd|public|private|pvt|co|company|inc|corporation|corp|ipo|fpo|ordinary|share|shares|unit|units|promoter|right|rights|bonus)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  /** Levenshtein similarity in [0,1] (1 = identical). */
  private levenshteinSimilarity(a: string, b: string): number {
    if (a === b) return 1
    if (!a.length || !b.length) return 0
    const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
    for (let i = 1; i <= a.length; i++) {
      const curr = [i]
      for (let j = 1; j <= b.length; j++) {
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      }
      for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
    }
    return 1 - prev[b.length] / Math.max(a.length, b.length)
  }

  /** Fuzzy score in [0,1] for a normalized needle against a candidate string. */
  private companyMatchScore(needle: string, candidate: string): number {
    if (!needle || !candidate) return 0
    if (needle === candidate) return 1
    const needleTokens = needle.split(" ").filter(Boolean)
    const candidateTokens = new Set(candidate.split(" ").filter(Boolean))
    if (needleTokens.length && needleTokens.every((token) => candidateTokens.has(token))) return 0.9
    const union = new Set([...needleTokens, ...candidateTokens])
    const intersection = needleTokens.filter((token) => candidateTokens.has(token)).length
    const jaccard = union.size ? intersection / union.size : 0
    if (jaccard >= 0.5) return 0.5 + 0.4 * jaccard
    const lev = this.levenshteinSimilarity(needle, candidate)
    return lev >= 0.75 ? lev : 0
  }
}
