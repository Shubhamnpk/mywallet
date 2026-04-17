#!/usr/bin/env node
/**
 * Prints VAPID key pair for Web Push. Run: node scripts/generate-vapid-keys.cjs
 * Add to Vercel:
 *   VAPID_PUBLIC_KEY (and optionally NEXT_PUBLIC_VAPID_PUBLIC_KEY with the same value)
 *   VAPID_PRIVATE_KEY (secret)
 *   VAPID_SUBJECT=mailto:your@email.com
 */
const webpush = require("web-push")

const keys = webpush.generateVAPIDKeys()
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey)
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey)
console.log("\nOptional duplicate for tooling that needs NEXT_PUBLIC_:")
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + keys.publicKey)
