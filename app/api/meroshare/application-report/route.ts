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
        { error: "Application report is only supported by the Direct REST provider" },
        { status: 400 },
      )
    }

    const { MeroShareRestClient, runWithSessionRecovery } = await import("../_lib/rest-api")
    const username = String(credentials.username || "").trim()

    const runFlow = async (client: InstanceType<typeof MeroShareRestClient>) => {
      await client.ensureSession(credentials)
      const rows = await client.getApplicationReports()
      const details: (Record<string, unknown> | null)[] = new Array(rows.length).fill(null)
      const concurrency = 3
      let cursor = 0
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          while (cursor < rows.length) {
            const index = cursor++
            const formId = Number(rows[index].applicantFormId ?? 0)
            if (formId > 0) {
              details[index] = await client.getApplicationDetail(formId).catch(() => null)
            }
          }
        }),
      )
      const mapped = rows.map((row, index) => {
        const detail = details[index] ?? null
        return {
          companyShareId: row.companyShareId ?? null,
          applicantFormId: row.applicantFormId ?? null,
          companyName: String(row.companyName ?? row.name ?? "").trim(),
          scrip: String(row.scrip ?? "").trim(),
          appliedKitta: Number(detail?.appliedKitta ?? row.appliedKitta ?? 0),
          receivedKitta: Number(detail?.receivedKitta ?? row.receivedKitta ?? 0),
          statusName: String(detail?.statusName ?? row.statusName ?? row.status ?? "").trim(),
          stageName: String(detail?.stageName ?? "").trim(),
          appliedDate: String(detail?.appliedDate ?? row.appliedDate ?? "").trim(),
          shareTypeName: String(row.shareTypeName ?? "").trim(),
          shareGroupName: String(row.shareGroupName ?? "").trim(),
          subGroup: String(row.subGroup ?? "").trim(),
          meroshareRemark: String(detail?.meroshareRemark ?? row.meroshareRemark ?? "").trim(),
          amount: Number(detail?.amount ?? 0),
        }
      })
      const user_name = (await client.getOwnData())?.name || credentials.username
      return NextResponse.json({ success: true, user_name, rows: mapped })
    }

    return await runWithSessionRecovery(username, (client) => runFlow(client))
  } catch (error: any) {
    const { describeMeroShareFailure } = await import("../_lib/rest-api")
    const failure = describeMeroShareFailure(error, "Failed to fetch application report")
    return NextResponse.json({ success: false, error: failure.message }, { status: failure.status })
  }
}
