import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"
import { isWebPushFullyConfigured } from "@/lib/push/env"
import { runOpenIpoPushJob } from "@/lib/push/ipo-open-snapshot"

export const runtime = "nodejs"

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

/**
 * Vercel Cron: configure CRON_SECRET and add this path in vercel.json crons.
 * Manual: curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/push-ipo
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return errorResponse({ status: 401, code: "UNAUTHORIZED", message: "Invalid or missing cron secret." })
  }

  if (!isWebPushFullyConfigured()) {
    return NextResponse.json({
      skipped: true,
      message: "Web Push or Redis not configured.",
    })
  }

  const result = await runOpenIpoPushJob()
  return NextResponse.json(result)
}
