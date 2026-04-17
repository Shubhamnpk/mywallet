import { NextResponse } from "next/server"
import { z } from "zod"
import { errorResponse } from "@/lib/api-error"
import { isWebPushFullyConfigured } from "@/lib/push/env"
import { savePushSubscription, type StoredPushSubscription } from "@/lib/push/subscription-store"

export const runtime = "nodejs"

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  expirationTime: z.number().nullable().optional(),
})

export async function POST(request: Request) {
  if (!isWebPushFullyConfigured()) {
    return errorResponse({
      status: 503,
      code: "NOT_CONFIGURED",
      message: "Web Push is not fully configured (VAPID + Redis).",
    })
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return errorResponse({
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid push subscription body.",
    })
  }

  const sub: StoredPushSubscription = {
    endpoint: parsed.data.endpoint,
    keys: parsed.data.keys,
    expirationTime: parsed.data.expirationTime,
  }

  try {
    await savePushSubscription(sub)
  } catch (e) {
    return errorResponse({
      status: 500,
      code: "STORE_FAILED",
      message: e instanceof Error ? e.message : "Failed to save subscription.",
    })
  }

  return NextResponse.json({ ok: true })
}
