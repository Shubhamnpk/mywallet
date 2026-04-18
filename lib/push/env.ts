/**
 * Web Push (VAPID) + optional Upstash Redis for subscription storage.
 * Set in Vercel: Project Settings → Environment Variables.
 */
export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
}

export function getVapidPrivateKey(): string {
  return process.env.VAPID_PRIVATE_KEY ?? ""
}

/** mailto:you@domain.com or https://your-site.com (required by web-push) */
export function getVapidSubject(): string {
  // Backward compatibility: older setups used VAPID_EMAIL.
  return process.env.VAPID_SUBJECT ?? process.env.VAPID_EMAIL ?? "mailto:support@mywallet.local"
}

export function isVapidConfigured(): boolean {
  const pub = getVapidPublicKey()
  const priv = getVapidPrivateKey()
  return Boolean(pub && priv)
}

export function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

export function isWebPushFullyConfigured(): boolean {
  return isVapidConfigured() && isUpstashConfigured()
}
