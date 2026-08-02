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

    const provider = options?.browserProvider || credentials?.browserProvider || "api"

    if (provider === "rest") {
      const { MeroShareRestClient } = await import("../_lib/rest-api")
      const client = new MeroShareRestClient()
      await client.login({
        dpId: credentials.dpId,
        username: credentials.username,
        password: credentials.password,
      })
      const ownData = await client.getOwnData()
      return NextResponse.json({
        success: true,
        message: `Login Successful! Welcome, ${ownData?.name || credentials.username}.`,
        user_name: ownData?.name || credentials.username,
        request_id: null,
        duration_ms: null,
      })
    }

    if (provider === "api") {
      const payload: any = { credentials: { dpId: credentials.dpId, username: credentials.username, password: credentials.password } }
      const data = await proxyToMeroShareApi("/test-login", payload)
      return NextResponse.json({ success: data.success, message: data.message, user_name: data.user_name, request_id: data.request_id, duration_ms: data.duration_ms })
    }

    const { getMeroShareBrowser } = await import("../_lib/browser")
    const { loginToMeroShare, getMeroShareProfileName } = await import("../_lib/transaction-history")

    let browser: any = null
    try {
      browser = await getMeroShareBrowser({ showBrowser: false, browserProvider: provider })
      const page = await browser.newPage()
      await loginToMeroShare(page, credentials)
      const profileName = await getMeroShareProfileName(page)
      await browser.close()
      browser = null
      return NextResponse.json({ success: true, message: `Login Successful! Welcome, ${profileName}.` })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Login failed" }, { status: 500 })
  }
}
