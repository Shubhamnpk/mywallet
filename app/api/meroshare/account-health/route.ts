import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const credentials = body.credentials
    const options = body.options

    if (!credentials?.dpId || !credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 })
    }

    const provider = options?.browserProvider || credentials?.browserProvider || "rest"
    if (provider !== "rest") {
      return NextResponse.json(
        { error: "Account health is only supported by the Direct REST provider" },
        { status: 400 },
      )
    }

    const { runWithSessionRecovery } = await import("../_lib/rest-api")
    const username = String(credentials.username || "").trim()

    return await runWithSessionRecovery(username, async (client) => {
      await client.ensureSession(credentials)
      const health = await client.getAccountHealth()
      const own = (health.own ?? {}) as Record<string, unknown>
      const myDetail = (health.myDetail ?? {}) as Record<string, unknown>
      const bank = (health.bank ?? {}) as Record<string, unknown>
      const branch = (bank.accountBranch ?? {}) as Record<string, unknown>
      const bankNested = (bank.bank ?? {}) as Record<string, unknown>
      return NextResponse.json({
        success: true,
        health: {
          name: String(own.name ?? "").trim() || String(myDetail.name ?? "").trim(),
          email: String(own.meroShareEmail ?? own.email ?? "").trim(),
          contact: String(own.contact ?? "").trim(),
          demat: String(own.demat ?? "").trim(),
          boid: String(own.boid ?? "").trim(),
          clientCode: String(own.clientCode ?? "").trim(),
          dematExpiryDate: String(own.dematExpiryDate ?? "").trim(),
          renewedDate: String(own.renewedDate ?? "").trim(),
          passwordExpiryDate: String(own.passwordExpiryDate ?? "").trim(),
          suspensionFlag: Number(own.suspensionFlag ?? 0),
          accountStatusName: String(myDetail.accountStatusName ?? "").trim(),
          accountNumber: String(myDetail.accountNumber ?? "").trim(),
          accountOpenDate: String(myDetail.accountOpenDate ?? "").trim(),
          bankName: String(bankNested.name ?? myDetail.bankName ?? "").trim(),
          bankCode: String(myDetail.bankCode ?? "").trim(),
          branchName: String(branch.name ?? "").trim(),
          branchCode: String(branch.code ?? myDetail.branchCode ?? "").trim(),
          crnNumber: String(bank.crnNumber ?? credentials?.crn ?? "").trim(),
        },
      })
    })
  } catch (error: any) {
    const { describeMeroShareFailure } = await import("../_lib/rest-api")
    const failure = describeMeroShareFailure(error, "Failed to fetch account health")
    return NextResponse.json({ success: false, error: failure.message }, { status: failure.status })
  }
}
