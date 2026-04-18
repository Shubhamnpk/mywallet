import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-error"
import {
  getVapidSubject,
  isUpstashConfigured,
  isVapidConfigured,
  isWebPushFullyConfigured,
} from "@/lib/push/env"
import { readLastPushJobResult } from "@/lib/push/health-store"
import { listPushSubscriptions } from "@/lib/push/subscription-store"

export const runtime = "nodejs"

function getHealthSecret(): string | null {
  return process.env.PUSH_HEALTH_SECRET ?? process.env.CRON_SECRET ?? null
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getHealthSecret()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!getHealthSecret()) {
    return errorResponse({
      status: 503,
      code: "NOT_CONFIGURED",
      message: "Set PUSH_HEALTH_SECRET (or CRON_SECRET) to use /api/push/health.",
    })
  }

  if (!isAuthorized(request)) {
    return errorResponse({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Invalid or missing health auth token.",
    })
  }

  const subscriptions = await listPushSubscriptions()
  const lastJob = await readLastPushJobResult()

  return NextResponse.json({
    now: new Date().toISOString(),
    config: {
      vapid: isVapidConfigured(),
      upstash: isUpstashConfigured(),
      ready: isWebPushFullyConfigured(),
      vapidSubjectConfigured: Boolean(getVapidSubject()),
    },
    delivery: {
      subscriptionCount: subscriptions.length,
      lastJob,
    },
  })
}

