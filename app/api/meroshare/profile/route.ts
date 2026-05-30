import { NextResponse } from "next/server"
import { getMeroShareBrowser } from "../_lib/browser"
import { getMeroShareProfileName, loginToMeroShare, logoutFromMeroShare } from "../_lib/transaction-history"

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
    const profileName = await getMeroShareProfileName(page)
    await logoutFromMeroShare(page)

    await browser.close()
    return NextResponse.json({
      success: true,
      profileName,
    })
  } catch (error: any) {
    console.error("Puppeteer MeroShare Profile Error:", error)
    if (browser) await browser.close()

    return NextResponse.json({
      error: error?.message || "Could not read MeroShare profile.",
    }, { status: 500 })
  }
}
