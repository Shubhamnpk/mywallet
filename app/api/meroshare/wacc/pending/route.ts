import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const credentials = body.credentials
    const scrip = String(body.scrip ?? body.symbol ?? "").trim()
    if (!credentials?.dpId || !credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
    }
    if (!scrip) return NextResponse.json({ error: "Missing scrip" }, { status: 400 })
    const { runWithSessionRecovery } = await import("../../_lib/rest-api")
    const username = String(credentials.username || "").trim()
    const data = await runWithSessionRecovery(username, async (client) => {
      await client.ensureSession({ dpId: credentials.dpId, username: credentials.username, password: credentials.password })
      return client.getWaccPending(scrip)
    })
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    const { describeMeroShareFailure } = await import("../../_lib/rest-api")
    const f = describeMeroShareFailure(error, "WACC pending fetch failed")
    return NextResponse.json({ success: false, error: f.message }, { status: f.status })
  }
}
