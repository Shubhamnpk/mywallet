import { NextResponse } from "next/server"
import { z } from "zod"
import { errorResponse } from "@/lib/api-error"
import { isWebPushFullyConfigured } from "@/lib/push/env"
import { removePushSubscriptionByEndpoint } from "@/lib/push/subscription-store"

export const runtime = "nodejs"

const bodySchema = z.object({
  endpoint: z.string().url(),
})

export async function POST(request: Request) {
  if (!isWebPushFullyConfigured()) {
    return errorResponse({
      status: 503,
      code: "NOT_CONFIGURED",
      message: "Web Push is not fully configured.",
    })
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return errorResponse({
      status: 400,
      code: "BAD_REQUEST",
      message: "Expected { endpoint }.",
    })
  }

  await removePushSubscriptionByEndpoint(parsed.data.endpoint)
  return NextResponse.json({ ok: true })
}
