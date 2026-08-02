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

  const provider = options?.browserProvider || credentials?.browserProvider || "api"

  if (provider === "rest") {
    try {
      const { MeroShareRestClient } = await import("../_lib/rest-api")
      const client = new MeroShareRestClient()
      await client.login({
        dpId: credentials.dpId,
        username: credentials.username,
        password: credentials.password,
      })
      const profileName = (await client.getOwnData())?.name || credentials.username
      const rows = await client.getTransactions()
      const transactions = rows.map((row) => ({
        scrip: row.scrip,
        transactionDate: row.transactionDate,
        creditQuantity: row.creditQuantity,
        debitQuantity: row.debitQuantity,
        balanceAfterTransaction: row.balanceAfterTransaction,
        historyDescription: row.historyDescription,
      }))
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
