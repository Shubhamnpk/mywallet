import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const credentials = body.credentials
    if (!credentials?.dpId || !credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
    }
    const { runWithSessionRecovery } = await import("../../_lib/rest-api")
    const username = String(credentials.username || "").trim()
    const data = await runWithSessionRecovery(username, async (client) => {
      await client.ensureSession({ dpId: credentials.dpId, username: credentials.username, password: credentials.password })
      return client.getWaccScrips()
    })
    return NextResponse.json({ success: true, ...data })
  } catch (error: any) {
    const { describeMeroShareFailure } = await import("../../_lib/rest-api")
    const f = describeMeroShareFailure(error, "WACC scrips fetch failed")
    return NextResponse.json({ success: false, error: f.message }, { status: f.status })
  }
}
