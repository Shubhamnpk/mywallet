import { NextResponse } from "next/server"
import { isWebPushFullyConfigured, isVapidConfigured } from "@/lib/push/env"

export const runtime = "nodejs"

/** Lets the client show Web Push UI only when the deployment is wired up. */
export async function GET() {
  return NextResponse.json({
    vapid: isVapidConfigured(),
    ready: isWebPushFullyConfigured(),
  })
}
