import { NextResponse } from "next/server"
import { proxyToMeroShareApi } from "../_lib/proxy-api"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const credentials = body.credentials
    const options = body.options
    const ipoDetails = body.ipoDetails || body.ipo_details

    if (!credentials?.dpId || !credentials?.username || !credentials?.password || !credentials?.crn || !credentials?.pin) {
      return NextResponse.json({ error: "Missing required credentials (dpId, username, password, crn, pin)" }, { status: 400 })
    }
    if (!ipoDetails?.company_share_id || !ipoDetails?.units) {
      return NextResponse.json({ error: "Missing IPO details (company_share_id, units)" }, { status: 400 })
    }

    const provider = options?.browserProvider || credentials?.browserProvider || "rest"

    if (provider === "rest") {
      const { MeroShareRestClient } = await import("../_lib/rest-api")
      const client = new MeroShareRestClient()
      await client.login({
        dpId: credentials.dpId,
        username: credentials.username,
        password: credentials.password,
        crn: credentials.crn,
        pin: credentials.pin,
      })
      const companyShareId = await client.resolveCompanyShareId(ipoDetails.company_share_id)
      let alreadyApplied = false
      let data: unknown
      try {
        data = await client.applyForIpo(
          {
            dpId: credentials.dpId,
            username: credentials.username,
            password: credentials.password,
            crn: credentials.crn,
            pin: credentials.pin,
          },
          { companyShareId, number_of_shares: Number(ipoDetails.units) || 10 },
        )
      } catch (error: any) {
        const message = String(error?.message || error || "")
        if (/already/i.test(message) || /duplicate/i.test(message)) {
          alreadyApplied = true
          data = error?.responseBody ?? null
        } else {
          throw error
        }
      }
      const user_name = (await client.getOwnData())?.name || credentials.username
      return NextResponse.json({
        success: true,
        application_id: (data as any)?.id ?? null,
        alreadyApplied,
        message: alreadyApplied
          ? "Already applied earlier; no new application was submitted."
          : ((data as any)?.message || "IPO application submitted successfully."),
        user_name,
        details: data,
      })
    }

    if (provider === "api") {
      const payload: any = {
        dp_id: credentials.dpId,
        username: credentials.username,
        password: credentials.password,
        crn: credentials.crn,
        pin: credentials.pin,
        ipo_details: {
          company_share_id: ipoDetails.company_share_id,
          units: ipoDetails.units,
          bank: ipoDetails.bank,
        },
      }
      const data = await proxyToMeroShareApi("/apply-ipo", payload)
      return NextResponse.json({ success: data.status === "success", application_id: data.application_id, message: data.message, user_name: data.user_name, details: data.details })
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

      const dpEl = await page.waitForSelector(".select2-selection", { timeout: 15000 }).catch(() => null)
      if (dpEl) {
        await dpEl.click()
        await sleep(1000)
        await page.type(".select2-search__field", credentials.dpId, { delay: 50 })
        await sleep(500)
        await page.keyboard.press("Enter")
        await sleep(1000)
      }

      await page.type("#appliedKitta", String(ipoDetails.units), { delay: 50 })
      await page.type("#crnNumber", credentials.crn, { delay: 50 })
      await page.click("#disclaimer").catch(() => {})
      await page.evaluate(() => { const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Proceed")); if (btn) btn.click() })
      await sleep(2000)
      await page.type("#transactionPIN", credentials.pin, { delay: 50 })
      await page.evaluate(() => { const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Apply")); if (btn) btn.click() })

      await sleep(5000)
      const successMsg = await page.evaluate(() => { const t = document.querySelector(".toast-success, .toast-error"); return t?.textContent?.trim() || null })
      await browser.close()
      browser = null
      return NextResponse.json({ success: true, message: successMsg || "IPO application submitted.", application_id: null })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "IPO application failed" }, { status: 500 })
  }
}
