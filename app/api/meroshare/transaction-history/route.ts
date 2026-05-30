import { NextResponse } from "next/server"
import { getMeroShareBrowser } from "../_lib/browser"
import { loginToMeroShare, scrapeMeroShareTransactionHistory } from "../_lib/transaction-history"

export async function POST(req: Request) {
  let browser: any = null

  try {
    const { credentials, options } = await req.json()

    if (!credentials || !credentials.dpId || !credentials.username || !credentials.password) {
      return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
    }

    browser = await getMeroShareBrowser({
      showBrowser: Boolean(options?.showBrowser),
      browserProvider: options?.browserProvider || credentials?.browserProvider,
    })
    const page = await browser.newPage()

    await loginToMeroShare(page, credentials)
    const transactions = await scrapeMeroShareTransactionHistory(page)

    await browser.close()
    return NextResponse.json({
      success: true,
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
