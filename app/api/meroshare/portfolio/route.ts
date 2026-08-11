import { NextResponse } from "next/server"
import { proxyToMeroShareApi } from "../_lib/proxy-api"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const credentials = body.credentials
    const options = body.options

    if (!credentials?.dpId || !credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
    }

    const provider = options?.browserProvider || credentials?.browserProvider || "rest"

    if (provider === "rest") {
      const { MeroShareRestClient } = await import("../_lib/rest-api")
      const client = new MeroShareRestClient()
      await client.login({
        dpId: credentials.dpId,
        username: credentials.username,
        password: credentials.password,
      })
      const rows = await client.getPortfolio()
      const portfolio = rows.map((row) => ({
        symbol: row.symbol,
        units: row.units,
        currentPrice: row.currentPrice,
        current_price: row.currentPrice,
        buyPrice: row.averageCost || 0,
        buy_price: row.averageCost || 0,
        previousClose: row.previousClose ?? null,
      }))
      const user_name = (await client.getOwnData())?.name || credentials.username
      return NextResponse.json({
        success: true,
        portfolio,
        message: portfolio.length ? `Fetched ${portfolio.length} holdings.` : "No holdings found.",
        user_name,
        total_positions: portfolio.length,
        total_units: portfolio.reduce((sum, row) => sum + (row.units || 0), 0),
      })
    }

    if (provider === "api") {
      const payload: any = { credentials: { dpId: credentials.dpId, username: credentials.username, password: credentials.password } }
      const data = await proxyToMeroShareApi("/portfolio", payload)
      return NextResponse.json({ success: data.success, portfolio: data.portfolio, message: data.message, user_name: data.user_name, total_positions: data.total_positions, total_units: data.total_units })
    }

    const { getMeroShareBrowser } = await import("../_lib/browser")
    const { loginToMeroShare } = await import("../_lib/transaction-history")

    let browser: any = null
    try {
      browser = await getMeroShareBrowser({ showBrowser: false, browserProvider: provider })
      const page = await browser.newPage()
      await loginToMeroShare(page, credentials)
      await page.goto("https://meroshare.cdsc.com.np/#/portfolio", { waitUntil: "networkidle2" })
      await page.waitForSelector("table", { timeout: 20000 }).catch(() => {})

      const portfolio = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("table tbody tr"))
        return rows.map(row => {
          const cols = row.querySelectorAll("td")
          if (cols.length < 5) return null
          const symbolText = (cols[1]?.textContent || "").trim()
          const symbol = symbolText.split(" ")[0].toUpperCase()
          const unitsStr = (cols[2]?.textContent || "").trim().replace(/,/g, "") || "0"
          const ltpStr = (cols[3]?.textContent || "").trim().replace(/,/g, "") || "0"
          return { symbol, units: parseFloat(unitsStr), current_price: parseFloat(ltpStr), buy_price: 0 }
        }).filter(item => item && item.symbol !== "TOTAL")
      })

      await browser.close()
      browser = null
      return NextResponse.json({ success: true, portfolio, message: portfolio.length ? `Fetched ${portfolio.length} holdings.` : "No holdings found." })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Portfolio sync failed" }, { status: 500 })
  }
}
