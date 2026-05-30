import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"

function getBrowserlessEndpoint() {
  const explicitEndpoint = process.env.BROWSERLESS_WS_ENDPOINT || process.env.BROWSERLESS_URL
  if (explicitEndpoint) return explicitEndpoint

  const token = process.env.BROWSERLESS_TOKEN
  if (!token) return ""

  const region = process.env.BROWSERLESS_REGION || "production-sfo"
  return `wss://${region}.browserless.io?token=${encodeURIComponent(token)}`
}

export type MeroShareBrowserProvider = "auto" | "browserless" | "local"

export async function getMeroShareBrowser(options?: { showBrowser?: boolean; browserProvider?: MeroShareBrowserProvider }) {
  const browserProvider = options?.browserProvider || "auto"
  const isVisibleDebug = process.env.MEROSHARE_VISIBLE_BROWSER === "1" || Boolean(options?.showBrowser) || browserProvider === "local"
  const browserlessEndpoint = getBrowserlessEndpoint()

  if (browserProvider === "browserless" && !browserlessEndpoint) {
    throw new Error("Browserless is selected, but BROWSERLESS_TOKEN, BROWSERLESS_URL, or BROWSERLESS_WS_ENDPOINT is not configured.")
  }

  if (browserProvider !== "local" && browserlessEndpoint) {
    return await puppeteer.connect({
      browserWSEndpoint: browserlessEndpoint,
    })
  }

  if (browserProvider === "local" && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
    throw new Error("Local Chrome browser mode is only available on a local development machine.")
  }

  if (browserProvider === "auto" && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: (chromium as any).defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: (chromium as any).headless,
    })
  }

  const executablePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[]

  let executablePath = ""
  for (const path of executablePaths) {
    if (require("fs").existsSync(path)) {
      executablePath = path
      break
    }
  }

  return await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: !isVisibleDebug,
    executablePath: executablePath || undefined,
  })
}
