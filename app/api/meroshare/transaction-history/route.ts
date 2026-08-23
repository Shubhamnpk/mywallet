import { NextResponse } from "next/server"
import { getMeroShareBrowser } from "../_lib/browser"
import { getMeroShareProfileName, loginToMeroShare, logoutFromMeroShare, scrapeMeroShareTransactionHistory } from "../_lib/transaction-history"

export async function POST(req: Request) {
  let browser: any = null

  let credentials: any, options: any
  try {
    const body = await req.json()
    credentials = body.credentials
    options = body.options
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!credentials || !credentials.dpId || !credentials.username || !credentials.password) {
    return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
  }

  const provider = options?.browserProvider || credentials?.browserProvider || "rest"

  if (provider === "rest") {
    try {
      const { runWithSessionRecovery, describeMeroShareFailure } = await import("../_lib/rest-api")
      const username = String(credentials.username || "").trim()
      const { profileName, transactions } = await runWithSessionRecovery(username, async (client) => {
        await client.ensureSession({
          dpId: credentials.dpId,
          username: credentials.username,
          password: credentials.password,
        })
        const profileName = (await client.getOwnData())?.name || credentials.username
        const rows = await client.getTransactions()
        return {
          profileName,
          transactions: rows.map((row) => ({
            scrip: row.scrip,
            transactionDate: row.transactionDate,
            creditQuantity: row.creditQuantity,
            debitQuantity: row.debitQuantity,
            balanceAfterTransaction: row.balanceAfterTransaction,
            historyDescription: row.historyDescription,
          })),
        }
      })
      return NextResponse.json({
        success: true,
        profileName,
        transactions,
        count: transactions.length,
        message: transactions.length
          ? `Fetched ${transactions.length} MeroShare transaction history rows.`
          : "No MeroShare transaction history rows found.",
      })
    } catch (error: any) {
      console.error("MeroShare REST Transaction History Error:", error)
      const { describeMeroShareFailure } = await import("../_lib/rest-api")
      const failure = describeMeroShareFailure(error, "An error occurred during transaction history sync.")
      return NextResponse.json({ error: failure.message }, { status: failure.status })
    }
  }

  if (provider === "api") {
    try {
      const { proxyToMeroShareApi } = await import("../_lib/proxy-api")
      const data = await proxyToMeroShareApi("/transaction-history", {
        credentials: {
          dpId: credentials.dpId,
          username: credentials.username,
          password: credentials.password,
        },
      })
      const transactions = Array.isArray(data.transactions) ? data.transactions : []
      return NextResponse.json({
        success: data.success,
        profileName: data.profileName ?? data.user_name ?? credentials.username,
        transactions,
        count: transactions.length,
        message: transactions.length
          ? `Fetched ${transactions.length} MeroShare transaction history rows.`
          : "No MeroShare transaction history rows found.",
      })
    } catch (error: any) {
      console.error("MeroShare API Transaction History Error:", error)
      return NextResponse.json({
        error: error?.message || "An error occurred during transaction history sync.",
      }, { status: 500 })
    }
  }

  try {
    browser = await getMeroShareBrowser({
      showBrowser: Boolean(options?.showBrowser),
      browserProvider: options?.browserProvider || credentials?.browserProvider,
    })
    const page = await browser.newPage()

    await loginToMeroShare(page, credentials)
    const profileName = await getMeroShareProfileName(page)
    const transactions = await scrapeMeroShareTransactionHistory(page)
    await logoutFromMeroShare(page)

    await browser.close()
    return NextResponse.json({
      success: true,
      profileName,
      transactions,
      count: transactions.length,
      message: transactions.length
        ? `Fetched ${transactions.length} MeroShare transaction history rows.`
        : "No MeroShare transaction history rows found.",
    })
  } catch (error: any) {
    console.error("Puppeteer Transaction History Error:", error)
    if (browser) await browser.close()

    return NextResponse.json({
      error: error?.message || "An error occurred during transaction history sync.",
    }, { status: 500 })
  }
}
