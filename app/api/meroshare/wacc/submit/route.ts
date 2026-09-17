import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const credentials = body.credentials
    const rows = body.rows
    if (!credentials?.dpId || !credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
    }
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "Missing rows" }, { status: 400 })
    const { runWithSessionRecovery } = await import("../../_lib/rest-api")
    const username = String(credentials.username || "").trim()
    const data = await runWithSessionRecovery(username, async (client) => {
      await client.ensureSession({ dpId: credentials.dpId, username: credentials.username, password: credentials.password })
      return client.submitWacc(rows)
    })
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    const { describeMeroShareFailure } = await import("../../_lib/rest-api")
    const f = describeMeroShareFailure(error, "WACC submit failed")
    return NextResponse.json({ success: false, error: f.message }, { status: f.status })
  }
}
