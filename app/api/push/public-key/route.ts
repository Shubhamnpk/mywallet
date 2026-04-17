import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"
import { getVapidPublicKey, isVapidConfigured } from "@/lib/push/env"

export const runtime = "nodejs"

export async function GET() {
  if (!isVapidConfigured()) {
    return errorResponse({
      status: 503,
      code: "NOT_CONFIGURED",
      message: "Web Push (VAPID) is not configured on the server.",
    })
  }

  return NextResponse.json({
    publicKey: getVapidPublicKey(),
  })
}
