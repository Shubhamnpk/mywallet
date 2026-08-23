import { NextResponse } from "next/server"
import { proxyToMeroShareApi } from "../_lib/proxy-api"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const credentials = body.credentials
    const options = body.options
    const ipoName = body.ipo_name || body.ipoName

    if (!credentials?.dpId || !credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
    }
    if (!ipoName) {
      return NextResponse.json({ error: "Missing ipo_name" }, { status: 400 })
    }

    const provider = options?.browserProvider || credentials?.browserProvider || "rest"

    if (provider === "rest") {
      const { runWithSessionRecovery } = await import("../_lib/rest-api")
      const username = String(credentials.username || "").trim()

      return await runWithSessionRecovery(username, async (client) => {
        await client.ensureSession(credentials)
        const result = await client.checkAllotmentViaApplicationReport(ipoName)
        const user_name = (await client.getOwnData())?.name || credentials.username
        if (!result.matched) {
          return NextResponse.json({
            success: true,
            status: "No Application",
            is_allotted: false,
            allotted_quantity: "0",
            user_name,
            details: null,
            message: `No MeroShare application found for '${ipoName}'. Did you apply for this IPO?`,
          })
        }
        return NextResponse.json({
          success: true,
          status: result.isAllotted ? "Allotted" : "Not Allotted",
          is_allotted: result.isAllotted,
          allotted_quantity: String(result.allottedQuantity ?? 0),
          user_name,
          details: result.row ?? null,
          message: result.isAllotted
            ? `Congratulations! You have been allotted ${result.allottedQuantity ?? 0} shares.`
            : `Not allotted in this round (status: ${result.statusName || "N/A"}).`,
        })
      })
    }

    if (provider === "api") {
      const payload: any = { credentials: { dpId: credentials.dpId, username: credentials.username, password: credentials.password }, ipoName }
      const data = await proxyToMeroShareApi("/check-allotment", payload)
      return NextResponse.json({
        success: data.success,
        status: data.status,
        is_allotted: data.is_allotted,
        allotted_quantity: data.allotted_quantity,
        user_name: data.user_name,
        details: data.all_details,
        message: data.message,
      })
    }

    const { getMeroShareBrowser } = await import("../_lib/browser")
    const { loginToMeroShare } = await import("../_lib/transaction-history")

    let browser: any = null
    try {
      browser = await getMeroShareBrowser({ showBrowser: false, browserProvider: provider })
      const page = await browser.newPage()
      await loginToMeroShare(page, credentials)
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      await page.goto("https://meroshare.cdsc.com.np/#/asba", { waitUntil: "networkidle2" })
      await sleep(3000)

      const ipoDropdown = await page.waitForSelector("select", { timeout: 10000 }).catch(() => null)
      if (ipoDropdown) {
        const options = await page.evaluate((name: string) => {
          const selects = Array.from(document.querySelectorAll("select"))
          for (const sel of selects) {
            for (const opt of Array.from(sel.options)) {
              if (opt.text.toLowerCase().includes(name.toLowerCase())) {
                sel.value = opt.value
                sel.dispatchEvent(new Event("change", { bubbles: true }))
                return true
              }
            }
          }
          return false
        }, ipoName)
      }

      await page.evaluate(() => { const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Search") || b.textContent?.includes("View")); if (btn) btn.click() })
      await sleep(3000)

      const result = await page.evaluate(() => {
        const table = document.querySelector("table")
        if (!table) return null
        const rows = table.querySelectorAll("tbody tr")
        if (rows.length === 0) return null
        const cells = rows[0].querySelectorAll("td")
        return {
          status: cells[3]?.textContent?.trim() || "",
          isAllotted: (cells[3]?.textContent?.trim() || "").toLowerCase().includes("allotted"),
          allottedQuantity: cells[4]?.textContent?.trim() || "0",
        }
      })

      await browser.close()
      browser = null
      return NextResponse.json({
        success: true,
        status: result?.status || "No data found",
        is_allotted: result?.isAllotted || false,
        allotted_quantity: result?.allottedQuantity || "0",
        message: result ? `Status: ${result.status}` : "No application record found.",
      })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error: any) {
    const { describeMeroShareFailure } = await import("../_lib/rest-api")
    const failure = describeMeroShareFailure(error, "Allotment check failed")
    return NextResponse.json({ success: false, error: failure.message }, { status: failure.status })
  }
}
