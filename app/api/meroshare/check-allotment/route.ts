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

    const provider = options?.browserProvider || credentials?.browserProvider || "api"

    if (provider === "rest") {
      const { MeroShareRestClient } = await import("../_lib/rest-api")
      const client = new MeroShareRestClient()
      await client.login({
        dpId: credentials.dpId,
        username: credentials.username,
        password: credentials.password,
      })
      const companyShareId = await client.resolveCompanyShareId(ipoName)
      const data = (await client.checkAllotment(companyShareId)) as any
      const allotted = data?.allotedQuantity ?? data?.allottedQuantity ?? data?.allotted_qty
      const isAllotted = Boolean(
        data?.isAlloted === true ||
          data?.isAllotted === true ||
          Number(allotted) > 0 ||
          String(data?.message ?? "").toLowerCase().includes("allotted"),
      )
      const user_name = (await client.getOwnData())?.name || credentials.username
      return NextResponse.json({
        success: true,
        status: isAllotted ? "Allotted" : "Not Allotted",
        is_allotted: isAllotted,
        allotted_quantity: String(allotted ?? 0),
        user_name,
        details: data,
        message: isAllotted
          ? `Congratulations! You have been allotted ${allotted ?? 0} shares.`
          : "Not allotted in this round.",
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
      await page.goto("https://meroshare.cdsc.com.np/#/asba", { waitUntil: "networkidle2" })
      await page.waitForTimeout(3000)

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
      await page.waitForTimeout(3000)

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
    return NextResponse.json({ success: false, error: error?.message || "Allotment check failed" }, { status: 500 })
  }
}
