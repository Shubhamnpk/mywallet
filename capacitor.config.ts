import type { CapacitorConfig } from "@capacitor/cli"

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim()
const allowNavigation = serverUrl
  ? [new URL(serverUrl).hostname]
  : undefined

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || "com.mywallet.app",
  appName: process.env.CAPACITOR_APP_NAME || "MyWallet",
  webDir: "mobile-shell",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
        allowNavigation,
      }
    : undefined,
}

export default config
