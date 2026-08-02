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

export class MeroShareRestClient {
  private authToken: string | null = null
  private ownData: OwnData | null = null

  private headers(): Record<string, string> {
    return {
      ...DEFAULT_HEADERS,
      ...(this.authToken ? { Authorization: this.authToken } : {}),
    }
  }

  private async request(
    method: string,
    url: string,
    body?: unknown,
    headers: Record<string, string> = this.headers(),
    signal?: AbortSignal,
  ): Promise<Response> {
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
        cache: "no-store",
      })
    } catch (err: any) {
      if (err?.name === "AbortError") throw err
      throw new MeroShareRestError(`Network error contacting MeroShare API: ${err?.message ?? "unknown error"}`)
    }
    return response
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

  /** Resolve the numeric client id for the given DP (matches both code and id). */
  async getClientId(dp: string): Promise<number> {
    const resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/capital/`)
    const data = (await this.assertOk(resp, "DP list")) as ClientIdData[]
    const match = Array.isArray(data)
      ? data.find((item) => item?.code === dp || String(item?.id) === dp)
      : null
    if (!match) {
      throw new MeroShareRestError(`DP '${dp}' not found in MeroShare DP list.`)
    }
    return match.id
  }

  /** Login and capture the Authorization token from the response headers. */
  async login(credentials: RestCredentials): Promise<{ token: string; raw: unknown }> {
    const clientId = await this.getClientId(credentials.dpId)
    const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShare/auth/`, {
      clientId,
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
    return { token, raw: await resp.json().catch(() => null) }
  }

  /** Load the logged-in user's own data (demat, clientCode, name). */
  async getOwnData(): Promise<OwnData> {
    if (this.ownData) return this.ownData
    const resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/ownDetail/`)
    const data = (await this.assertOk(resp, "own detail")) as OwnData
    this.ownData = data || {}
    return this.ownData
  }

  private async getRequiredField(...keys: string[]): Promise<string> {
    const own = await this.getOwnData()
    for (const key of keys) {
      const value = own[key]
      if (typeof value === "string" && value.trim()) return value.trim()
      if (typeof value === "number") return String(value)
    }
    throw new MeroShareRestError(`MeroShare own detail is missing required field: ${keys.join(" / ")}`)
  }

  private async demat(): Promise<string> {
    return this.getRequiredField("demat", "boid")
  }

  private async clientCode(): Promise<string> {
    return this.getRequiredField("clientCode")
  }

  /** Fetch the full portfolio holdings. */
  async getPortfolio(): Promise<RestPortfolioRow[]> {
    const [demat, code] = await Promise.all([this.demat(), this.clientCode()])
    const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShareView/myPortfolio/`, {
      sortBy: "script",
      demat: [demat],
      clientCode: code,
      page: 1,
      size: 200,
      sortAsc: true,
    })
    const data = (await this.assertOk(resp, "portfolio")) as { object?: unknown[] } | unknown[]
    const rows = Array.isArray(data) ? data : (data as { object?: unknown[] })?.object ?? []
    return (Array.isArray(rows) ? rows : [])
      .map((raw) => this.mapPortfolioRow(raw as Record<string, unknown>))
      .filter((row) => row.symbol)
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
      raw.symbol ?? raw.scrip ?? raw.stockSymbol ?? raw.shareSymbol ?? raw["stockSymbol"] ?? "",
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
    const [demat, code] = await Promise.all([this.demat(), this.clientCode()])
    const resp = await this.request("POST", `${MEROSHARE_BASE}/api/meroShareView/myTransaction/`, {
      boid: demat,
      clientCode: code,
      script: symbol || null,
      fromDate: null,
      toDate: null,
      requestTypeScript: Boolean(symbol),
      page: 1,
      size: 200,
    })
    const data = (await this.assertOk(resp, "transaction history")) as { object?: unknown[] } | unknown[]
    const rows = Array.isArray(data) ? data : (data as { object?: unknown[] })?.object ?? []
    return (Array.isArray(rows) ? rows : [])
      .map((raw) => this.mapTransactionRow(raw as Record<string, unknown>))
      .filter((row) => row.scrip && row.transactionDate)
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
      scrip: str(["scrip", "symbol", "stockSymbol", "shareSymbol"]).toUpperCase(),
      transactionDate: str(["transactionDate", "txnDate", "tranDate", "date"]),
      creditQuantity: num(["creditQuantity", "creditQty", "buyQty", "qtyCredit"]),
      debitQuantity: num(["debitQuantity", "debitQty", "sellQty", "qtyDebit"]),
      balanceAfterTransaction: num(["balanceAfterTransaction", "balanceQty", "balance", "closingBalance"]),
      historyDescription: str(["historyDescription", "description", "remarks", "narrative", "transactionDescription"]),
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
      size: 10,
      searchRoleViewConstants: "VIEW_APPLICABLE_SHARE",
      filterDateParams: [
        { key: "minIssueOpenDate", condition: "", alias: "", value: "" },
        { key: "maxIssueCloseDate", condition: "", alias: "", value: "" },
      ],
    })
    const data = (await this.assertOk(resp, "applicable shares")) as { object?: unknown[] }
    return Array.isArray(data?.object) ? data.object : []
  }

  /** Check whether the account is eligible to apply for the given IPO. */
  async canApplyToIpo(companyShareId: number | string): Promise<boolean> {
    const demat = await this.demat()
    const resp = await this.request(
      "GET",
      `${MEROSHARE_BASE}/api/meroShare/applicantForm/customerType/${companyShareId}/${demat}`,
    )
    if (!resp.ok) {
      return false
    }
    const data = (await resp.json().catch(() => null)) as { message?: string } | null
    return data?.message === "Customer can apply."
  }

  /** GET /api/meroShareView/myDetail/{BOID} — the user's bank + account details. */
  private async getMyDetail(): Promise<Record<string, unknown>> {
    const boid = await this.getRequiredField("boid", "demat")
    const resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShareView/myDetail/${boid}`)
    const data = (await this.assertOk(resp, "my bank detail")) as Record<string, unknown>
    return data ?? {}
  }

  /** GET /api/bankRequest/{BANK_CODE} — account branch, bank and CRN. */
  private async getBankRequest(bankCode: string): Promise<Record<string, unknown>> {
    const resp = await this.request("GET", `${MEROSHARE_BASE}/api/bankRequest/${bankCode}`)
    const data = (await this.assertOk(resp, "bank request")) as Record<string, unknown>
    return data ?? {}
  }

  /** GET /api/meroShare/bank/ — the list of banks (first entry is used by nepse_tools). */
  private async getBankListView(): Promise<Record<string, unknown>> {
    const resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/bank/`)
    const data = (await this.assertOk(resp, "bank list")) as Record<string, unknown>[] | Record<string, unknown>
    return Array.isArray(data) ? (data[0] ?? {}) : data ?? {}
  }

  /** GET /api/meroShare/bank/{BANK_ID} — account branch id, account number, bank id, customer id. */
  private async getBankDetailView(bankId: number): Promise<Record<string, unknown>> {
    const resp = await this.request("GET", `${MEROSHARE_BASE}/api/meroShare/bank/${bankId}`)
    const data = (await this.assertOk(resp, "bank detail view")) as Record<string, unknown>
    return data ?? {}
  }

  /** Resolve the numeric bank/account ids required by the CDSC apply payload. */
  private async resolveBankApplyContext() {
    const myDetail = await this.getMyDetail()
    const bankCode = String(myDetail.bankCode ?? myDetail["bankCode"] ?? "")

    let bankRequest: Record<string, unknown> = {}
    let bankListView: Record<string, unknown> = {}
    let bankDetailView: Record<string, unknown> = {}

    if (bankCode) {
      bankRequest = await this.getBankRequest(bankCode).catch(() => ({}))
    }

    try {
      bankListView = await this.getBankListView()
    } catch {
      bankListView = {}
    }
    const bankId = Number(
      (bankRequest.bank as Record<string, unknown> | undefined)?.id
        ?? bankListView.id
        ?? (bankDetailView.bankId as number | undefined)
        ?? 0,
    )

    if (bankId) {
      bankDetailView = await this.getBankDetailView(bankId).catch(() => ({}))
    }

    return {
      accountBranchId: Number(
        (bankRequest.accountBranch as Record<string, unknown> | undefined)?.id
          ?? bankDetailView.accountBranchId
          ?? 0,
      ),
      accountNumber: String(bankDetailView.accountNumber ?? myDetail.accountNumber ?? ""),
      bankId,
      crnNumber: String(bankRequest.crnNumber ?? ""),
      customerId: Number(bankDetailView.id ?? 0),
    }
  }

  /** Apply for an IPO with the standard payload (mirrors nepse_tools apply_for_ipo). */
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
    const [demat, code] = await Promise.all([this.demat(), this.clientCode()])
    const pin = credentials.pin
    if (!pin) {
      throw new MeroShareRestError("Transaction PIN is required to apply for an IPO.")
    }

    // CDSC requires the bank context (branch, bank, account, CRN) to be valid on apply.
    const bank = await this.resolveBankApplyContext().catch(() => null)

    // Mirrors the exact nepse_tools payload shape (clientCode is not part of it).
    return {
      accountBranchId: bank?.accountBranchId || null,
      accountNumber: bank?.accountNumber || null,
      appliedKitta: String(opts.number_of_shares),
      bankId: bank?.bankId || null,
      boid: demat,
      companyShareId: String(opts.companyShareId),
      crnNumber: credentials.crn || bank?.crnNumber || null,
      customerId: bank?.customerId || null,
      demat,
      transactionPIN: pin,
    }
  }

  /** List companies that have uploaded IPO results on the iporesult host. */
  async getIpoResultCompanyList(): Promise<IpoResultCompany[]> {
    const resp = await this.request("GET", `${IPO_RESULT_BASE}/result/companyShares/fileUploaded`, undefined, {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": DEFAULT_HEADERS["User-Agent"],
    })
    const data = (await this.assertOk(resp, "IPO result company list")) as unknown
    const rows = Array.isArray(data) ? data : (data as { object?: unknown[] })?.object ?? []
    return (Array.isArray(rows) ? rows : []) as IpoResultCompany[]
  }

  /** Check IPO allotment for the given company share id and BOID/demat. */
  async checkAllotment(companyShareId: number | string, boid?: string): Promise<unknown> {
    const demat = boid ?? (await this.demat())
    const resp = await this.request(
      "POST",
      `${IPO_RESULT_BASE}/result/result/check`,
      { companyShareId: Number(companyShareId), boid: demat },
      {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
      },
    )
    return this.assertOk(resp, "IPO allotment check")
  }

  /** Resolve an IPO company share id from a scrip/name via the applicable list, then the results list. */
  async resolveCompanyShareId(identifier: string | number): Promise<number> {
    if (typeof identifier === "number") return identifier
    const numeric = Number(identifier)
    if (Number.isFinite(numeric) && numeric > 0) return numeric

    const needle = String(identifier).trim().toLowerCase()

    // Open IPOs are only present in the applicable-shares list (e.g. for applying).
    const applicable = await this.getApplicableShares().catch(() => [] as unknown[])
    const applicableMatch = (applicable as Record<string, unknown>[]).find((share) => {
      const haystack = [
        share.companyShareId,
        share.scrip,
        share["companyName"],
        share.name,
        share["companyIssue"],
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle) || haystack.includes(needle.replace(/\s+/g, ""))
    })
    if (applicableMatch) {
      return Number(applicableMatch.companyShareId)
    }

    // Closed IPOs / result checks are in the uploaded-results list.
    const companies = await this.getIpoResultCompanyList()
    const match = companies.find((company) => {
      const haystack = [
        company.shareId,
        company.companyShareId,
        company.scrip,
        company.companyName,
        company.name,
      ].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(needle)
    })

    if (!match) {
      throw new MeroShareRestError(`Could not resolve '${identifier}' to a MeroShare IPO company.`)
    }
    return Number(match.shareId ?? match.companyShareId)
  }
}
